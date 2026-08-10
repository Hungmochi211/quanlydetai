import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FinalizeAcceptanceDto, SubmitAcceptanceScoreDto, CreateAcceptanceDossierDto, UpdateAcceptanceDossierDto, } from 'src/dto/AcceptanceDto';
import { HoSoNghiemThu, PhieuChamNghiemThu, } from 'src/entity/acceptance.entity';
import { HoiDongDeTai, ThanhVienHoiDong, } from 'src/entity/council.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { In, Repository } from 'typeorm';

const EDITABLE = ['Nháp', 'Yêu cầu bổ sung'];

@Injectable()
export class AcceptanceService {
  constructor(
    @InjectRepository(HoSoNghiemThu)
    private readonly dossierRepo: Repository<HoSoNghiemThu>,
    @InjectRepository(PhieuChamNghiemThu)
    private readonly scoreRepo: Repository<PhieuChamNghiemThu>,
    @InjectRepository(DeTai)
    private readonly projectRepo: Repository<DeTai>,
    @InjectRepository(ThanhVienDT)
    private readonly memberRepo: Repository<ThanhVienDT>,
    @InjectRepository(TaiLieu)
    private readonly documentRepo: Repository<TaiLieu>,
    @InjectRepository(HoiDongDeTai)
    private readonly assignmentRepo: Repository<HoiDongDeTai>,
    @InjectRepository(ThanhVienHoiDong)
    private readonly councilMemberRepo: Repository<ThanhVienHoiDong>,
    private readonly notifications: NotificationsService,
  ) { }

  async createDraft(maDT: string, dto: CreateAcceptanceDossierDto, account: string) {
    const project = await this.getProject(maDT);
    await this.ensureLeader(maDT, account);
    if (project.TrangThai !== 'Chờ nghiệm thu') {
      throw new BadRequestException(
        'Chỉ đề tài ở trạng thái Chờ nghiệm thu mới được tạo hồ sơ nghiệm thu',
      );
    }

    const existing = await this.dossierRepo.findOne({
      where: { MaDT: project.MaDT },
    });
    if (existing) {
      throw new BadRequestException(
        'Đề tài đã có hồ sơ nghiệm thu. Hãy chỉnh sửa hoặc gửi hồ sơ hiện có',
      );
    }

    return this.dossierRepo.save(
      this.dossierRepo.create({
        MaDT: project.MaDT,
        TaiKhoanNguoiGui: account,
        GhiChu: dto.GhiChu?.trim(),
        TrangThai: 'Nháp',
      }),
    );
  }

  async findByProject(maDT: string, account: string) {
    await this.ensureCanView(maDT, account);
    return this.dossierRepo.find({
      where: { MaDT: maDT },
      relations: ['TaiLieu', 'PhieuCham', 'PhieuCham.NguoiHoiDong'],
      order: { NgayTao: 'DESC' },
    });
  }

  async updateDraft(id: number, dto: UpdateAcceptanceDossierDto, account: string) {
    const dossier = await this.getDossier(id);
    await this.ensureLeader(dossier.MaDT, account);
    this.ensureEditable(dossier);

    if (dto.GhiChu !== undefined) {
      await this.dossierRepo.update(id, {
        GhiChu: dto.GhiChu.trim() || undefined,
      });
    }

    return this.getDossier(id);
  }

  async remove(id: number, account: string) {
    const dossier = await this.getDossier(id);
    await this.ensureLeader(dossier.MaDT, account);
    if (dossier.TrangThai !== 'Nháp') {
      throw new BadRequestException(
        'Chỉ được xóa hồ sơ nghiệm thu ở trạng thái Nháp',
      );
    }

    await this.dossierRepo.remove(dossier);
    return { message: 'Đã xóa hồ sơ nghiệm thu' };
  }

  async submit(id: number, account: string) {
    const dossier = await this.getDossier(id);
    await this.ensureLeader(dossier.MaDT, account);
    this.ensureEditable(dossier);
    const files = await this.documentRepo.count({
      where: { MaHoSoNghiemThu: id },
    });
    if (!files) {
      throw new BadRequestException(
        'Cần đính kèm ít nhất một tài liệu hồ sơ nghiệm thu trước khi gửi',
      );
    }

    const council = await this.getAssignedScoringCouncil(dossier.MaDT);
    const members = await this.councilMemberRepo.find({
      where: { MaHoiDong: council.MaHoiDong },
    });
    if (!members.length) {
      throw new BadRequestException('Hội đồng nghiệm thu chưa có thành viên');
    }
    await this.dossierRepo.update(id, {
      TrangThai: 'Đang chấm',
      NgayGui: new Date(),
    });
    const project = await this.getProject(dossier.MaDT);
    project.TrangThai = 'Đang nghiệm thu';
    await this.projectRepo.save(project);
    await Promise.all(
      members.map((member) =>
        this.notifications.create(
          { TaiKhoan: account },
          {
            TkNguoiNhan: member.TaiKhoan,
            TieuDe: 'Có hồ sơ nghiệm thu cần chấm',
            NoiDung: `Đề tài "${project.TenDT}" đã gửi hồ sơ nghiệm thu.`,
            NgayTao: new Date(),
          },
        ),
      ),
    );
    return this.getDossier(id);
  }

  async submitScore(id: number, dto: SubmitAcceptanceScoreDto, account: string,) {
    const dossier = await this.getDossier(id);
    if (dossier.TrangThai !== 'Đang chấm') {
      throw new BadRequestException('Hồ sơ chưa ở giai đoạn chấm điểm');
    }

    await this.ensureScoringMember(dossier.MaDT, account);
    let score = await this.scoreRepo.findOne({
      where: { MaHoSoNghiemThu: id, TaiKhoanHoiDong: account },
    });

    const scoreData = {
      Diem: dto.Diem,
      NhanXet: dto.NhanXet.trim(),
      TrangThai: 'Đã gửi',
      NgayGui: new Date(),
    };

    if (!score) {
      await this.scoreRepo.save(
        this.scoreRepo.create({
          MaHoSoNghiemThu: id,
          TaiKhoanHoiDong: account,
          ...scoreData,
        }),
      );
    } else {
      // Không dùng save(score) ở đây. Entity có cả cột MaHoSoNghiemThu và
      // quan hệ HoSoNghiemThu dùng chung khóa ngoại; khi quan hệ chưa được
      // nạp, TypeORM có thể sinh UPDATE gán khóa ngoại thành NULL.
      await this.scoreRepo.update(score.Id, scoreData);
    }

    await this.refreshAverage(dossier);
    return this.getDossier(id);
  }

  async finalize(id: number, dto: FinalizeAcceptanceDto, account: string) {
    const dossier = await this.getDossier(id);
    if (dossier.TrangThai !== 'Đang chấm') {
      throw new BadRequestException('Chỉ chốt hồ sơ đang chấm');
    }

    await this.ensureChairman(dossier.MaDT, account);
    const memberAccounts = await this.getScoringAccounts(dossier.MaDT);
    const scores = await this.scoreRepo.find({
      where: {
        MaHoSoNghiemThu: id,
        TaiKhoanHoiDong: In(memberAccounts),
        TrangThai: 'Đã gửi',
      },
    });
    if (scores.length !== memberAccounts.length) {
      throw new BadRequestException(
        'Chưa đủ phiếu chấm của tất cả thành viên hội đồng',
      );
    }

    await this.refreshAverage(dossier);
    const status =
      dto.KetQua === 'Đạt'
        ? 'Đã chốt'
        : dto.KetQua === 'Không đạt'
          ? 'Không đạt'
          : 'Yêu cầu bổ sung';

    await this.dossierRepo.update(id, {
      DiemCuoiCung: dto.DiemCuoiCung,
      ChatLuong: dto.ChatLuong.trim(),
      KetQuaCuoiCung: dto.KetQua,
      NhanXetChuTich: dto.NhanXetChuTich.trim(),
      TaiKhoanChuTichChot: account,
      NgayChot: new Date(),
      TrangThai: status,
    });
    const project = await this.getProject(dossier.MaDT);
    project.TrangThai =
      dto.KetQua === 'Đạt'
        ? 'Đã nghiệm thu'
        : dto.KetQua === 'Không đạt'
          ? 'Không đạt nghiệm thu'
          : 'Chờ nghiệm thu';
    await this.projectRepo.save(project);
    await this.notifications.create(
      { TaiKhoan: account },
      {
        TkNguoiNhan: dossier.TaiKhoanNguoiGui,
        TieuDe: 'Kết quả nghiệm thu đề tài',
        NoiDung: `Hồ sơ nghiệm thu được kết luận: ${dto.KetQua}.`,
        NgayTao: new Date(),
      },
    );
    return this.getDossier(id);
  }

  private async getDossier(id: number) {
    const item = await this.dossierRepo.findOne({
      where: { Id: id },
      relations: ['TaiLieu', 'PhieuCham', 'PhieuCham.NguoiHoiDong'],
    });
    if (!item) {
      throw new NotFoundException('Không tìm thấy hồ sơ nghiệm thu');
    }

    return item;
  }

  private async getProject(maDT: string) {
    const item = await this.projectRepo.findOne({ where: { MaDT: maDT } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy đề tài');
    }

    return item;
  }

  private ensureEditable(dossier: HoSoNghiemThu) {
    if (!EDITABLE.includes(dossier.TrangThai)) {
      throw new BadRequestException('Hồ sơ đã gửi không thể chỉnh sửa');
    }
  }

  private async ensureLeader(maDT: string, account: string) {
    const member = await this.memberRepo.findOne({
      where: { MaDT: maDT, TaiKhoan: account },
    });
    if (!member || !this.normal(member.VaiTroDT).includes('nhom truong')) {
      throw new ForbiddenException(
        'Chỉ nhóm trưởng được thao tác hồ sơ nghiệm thu',
      );
    }
  }

  private async ensureCanView(maDT: string, account: string) {
    const projectMember = await this.memberRepo.findOne({
      where: { MaDT: maDT, TaiKhoan: account },
    });
    if (projectMember) {
      return;
    }

    await this.ensureScoringMember(maDT, account);
  }

  private async ensureScoringMember(maDT: string, account: string) {
    const scoringAccounts = await this.getScoringAccounts(maDT);
    if (!scoringAccounts.includes(account)) {
      throw new ForbiddenException(
        'Bạn không thuộc hội đồng nghiệm thu của đề tài',
      );
    }
  }

  private async ensureChairman(maDT: string, account: string) {
    const assignments = await this.getScoringAssignments(maDT);
    const member = await this.councilMemberRepo.findOne({
      where: assignments.map((a) => ({
        MaHoiDong: a.MaHoiDong,
        TaiKhoan: account,
      })),
    });
    if (!member || !this.normal(member.ChucDanh).includes('chu tich')) {
      throw new ForbiddenException(
        'Chỉ Chủ tịch hội đồng nghiệm thu được chốt kết quả',
      );
    }
  }

  private async getScoringAssignments(maDT: string) {
    const list = await this.assignmentRepo.find({
      where: { MaDT: maDT },
      relations: ['LoaiHoiDong'],
    });
    return list.filter((item) => item.LoaiHoiDong?.NghiepVu === 'scoring');
  }

  private async getScoringAccounts(maDT: string) {
    const ids = (await this.getScoringAssignments(maDT)).map(
      (a) => a.MaHoiDong,
    );
    if (!ids.length) {
      return [];
    }

    const members = await this.councilMemberRepo.find({
      where: { MaHoiDong: In(ids) },
    });
    return [...new Set(members.map((m) => m.TaiKhoan))];
  }

  private async getAssignedScoringCouncil(maDT: string) {
    const existing = await this.getScoringAssignments(maDT);
    if (!existing.length) {
      throw new BadRequestException(
        'Đề tài chưa được Admin phân công hội đồng nghiệm thu',
      );
    }
    return existing[0];
  }

  private async refreshAverage(dossier: HoSoNghiemThu) {
    const scores = await this.scoreRepo.find({
      where: { MaHoSoNghiemThu: dossier.Id, TrangThai: 'Đã gửi' },
    });
    const average = scores.length
      ? Number(
        (
          scores.reduce((sum, item) => sum + Number(item.Diem), 0) /
          scores.length
        ).toFixed(2),
      )
      : undefined;

    await this.dossierRepo.update(dossier.Id, {
      DiemTrungBinh: average,
    });
  }

  private normal(value?: string) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim();
  }
}
