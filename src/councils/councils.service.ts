import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { HoiDong, HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong, YeuCauPhanCongHoiDong } from 'src/entity/council.entity';
import { HoSoNghiemThu, PhieuChamNghiemThu } from 'src/entity/acceptance.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { In, Repository } from 'typeorm';
import {
  AddCouncilMemberDto,
  AssignCouncilToProjectDto,
  CreateCouncilTypeDto,
  CreateCouncilDto,
  CreateCouncilAssignmentRequestDto,
  RejectCouncilAssignmentRequestDto,
  UpdateCouncilTypeDto,
  UpdateCouncilDto,
} from 'src/dto/CouncilDto';

@Injectable()
export class CouncilsService {
  constructor(
    @InjectRepository(HoiDong) private readonly councilRepository: Repository<HoiDong>,
    @InjectRepository(ThanhVienHoiDong) private readonly memberRepository: Repository<ThanhVienHoiDong>,
    @InjectRepository(HoiDongDeTai) private readonly assignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(LoaiHoiDong) private readonly councilTypeRepository: Repository<LoaiHoiDong>,
    @InjectRepository(NguoiDung) private readonly userRepository: Repository<NguoiDung>,
    @InjectRepository(DeTai) private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(ThanhVienDT) private readonly projectMemberRepository: Repository<ThanhVienDT>,
    @InjectRepository(YeuCauPhanCongHoiDong) private readonly requestRepository: Repository<YeuCauPhanCongHoiDong>,
    @InjectRepository(HoSoNghiemThu) private readonly acceptanceDossierRepository: Repository<HoSoNghiemThu>,
    @InjectRepository(PhieuChamNghiemThu) private readonly acceptanceScoreRepository: Repository<PhieuChamNghiemThu>,
    @InjectRepository(XetDuyetDeTai) private readonly legacyApprovalRepository: Repository<XetDuyetDeTai>,
    private readonly notifications: NotificationsService,
  ) { }

  findAll(typeId?: number) {
    return this.councilRepository.find({
      where: typeId ? { MaLoaiHoiDong: typeId } : {},
      relations: ['LoaiHoiDong', 'ThanhVienHoiDong'],
      order: { MaHoiDong: 'DESC' },
    });
  }

  async findOne(id: number) {
    const council = await this.councilRepository.findOne({
      where: { MaHoiDong: id },
      relations: [
        'LoaiHoiDong',
        'ThanhVienHoiDong',
        'ThanhVienHoiDong.NguoiDung',
        'HoiDongDeTai',
        'HoiDongDeTai.DeTai',
      ],
    });
    if (!council) throw new NotFoundException('Không tìm thấy hội đồng');
    return council;
  }

  async create(dto: CreateCouncilDto) {
    await this.findType(dto.MaLoaiHoiDong);
    const council = this.councilRepository.create({
      TenHoiDong: dto.TenHoiDong.trim(),
      MaLoaiHoiDong: dto.MaLoaiHoiDong,
      MoTa: dto.MoTa?.trim() || undefined,
      LaHoiDongMacDinh: dto.LaHoiDongMacDinh ?? false,
    });
    const saved = await this.councilRepository.save(council);
    return this.findOne(saved.MaHoiDong);
  }

  async update(id: number, dto: UpdateCouncilDto) {
    await this.findOne(id);
    if (dto.MaLoaiHoiDong !== undefined) await this.findType(dto.MaLoaiHoiDong);
    await this.councilRepository.update(
      { MaHoiDong: id },
      {
        ...(dto.TenHoiDong !== undefined ? { TenHoiDong: dto.TenHoiDong.trim() } : {}),
        ...(dto.MaLoaiHoiDong !== undefined ? { MaLoaiHoiDong: dto.MaLoaiHoiDong } : {}),
        ...(dto.MoTa !== undefined ? { MoTa: dto.MoTa.trim() || null } : {}),
        ...(dto.LaHoiDongMacDinh !== undefined ? { LaHoiDongMacDinh: dto.LaHoiDongMacDinh } : {}),
      },
    );
    return this.findOne(id);
  }

  async remove(id: number) {
    const assignmentCount = await this.assignmentRepository.count({ where: { MaHoiDong: id } });
    if (assignmentCount > 0) {
      throw new BadRequestException('Không thể xóa hội đồng đã được gán cho đề tài');
    }
    const result = await this.councilRepository.delete({ MaHoiDong: id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy hội đồng');
    return { message: 'Đã xóa hội đồng' };
  }

  async addMember(councilId: number, dto: AddCouncilMemberDto) {
    await this.findOne(councilId);
    const user = await this.userRepository.findOne({ where: { TaiKhoan: dto.TaiKhoan } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản thành viên');

    const existing = await this.memberRepository.findOne({
      where: { MaHoiDong: councilId, TaiKhoan: dto.TaiKhoan },
    });
    if (existing) throw new BadRequestException('Tài khoản đã là thành viên hội đồng');

    return this.memberRepository.save(
      this.memberRepository.create({
        MaHoiDong: councilId,
        TaiKhoan: dto.TaiKhoan,
        ChucDanh: dto.ChucDanh ?? 'Ủy viên',
      }),
    );
  }

  async removeMember(councilId: number, taiKhoan: string) {
    const council = await this.findOne(councilId);
    const member = await this.memberRepository.findOne({
      where: { MaHoiDong: councilId, TaiKhoan: taiKhoan },
    });
    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong hội đồng');
    }

    let deletedScores = 0;
    if (council.LoaiHoiDong.NghiepVu === 'scoring') {
      deletedScores = await this.removeAcceptanceScores(councilId, taiKhoan);
    }

    const result = await this.memberRepository.delete({ MaHoiDong: councilId, TaiKhoan: taiKhoan });
    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy thành viên trong hội đồng');
    }

    return {
      message: 'Đã xóa thành viên khỏi hội đồng',
      deletedScores,
    };
  }

  async assignToProject(maDT: string, dto: AssignCouncilToProjectDto) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài');
    const council = await this.findOne(dto.MaHoiDong);
    if (council.ThanhVienHoiDong.length === 0) {
      throw new BadRequestException('Hội đồng phải có ít nhất một thành viên trước khi được gán');
    }
    const existingByType = await this.assignmentRepository.findOne({
      where: { MaDT: maDT, MaLoaiHoiDong: council.MaLoaiHoiDong },
    });
    if (existingByType) {
      throw new BadRequestException(`Đề tài đã có hội đồng loại ${council.LoaiHoiDong.TenLoaiHoiDong}`);
    }
    return this.assignmentRepository.save(
      this.assignmentRepository.create({
        MaDT: maDT,
        MaHoiDong: council.MaHoiDong,
        MaLoaiHoiDong: council.MaLoaiHoiDong,
      }),
    );
  }

  async removeProjectAssignment(maDT: string, councilId: number) {
    const result = await this.assignmentRepository.delete({ MaDT: maDT, MaHoiDong: councilId });
    if (!result.affected) throw new NotFoundException('Không tìm thấy phân công hội đồng cho đề tài');
    return { message: 'Đã gỡ hội đồng khỏi đề tài' };
  }

  async createAssignmentRequest(
    maDT: string,
    sender: string,
    dto: CreateCouncilAssignmentRequestDto,
    originalRequestId?: number,
  ) {
    const project = await this.getProject(maDT);
    await this.ensureProjectLeader(maDT, sender);
    const councilType = await this.findType(dto.MaLoaiHoiDong);
    await this.ensureRequestAllowed(project, councilType.NghiepVu);

    const assigned = await this.assignmentRepository.findOne({
      where: { MaDT: maDT, MaLoaiHoiDong: dto.MaLoaiHoiDong },
    });
    if (assigned) {
      throw new BadRequestException('Đề tài đã được phân công hội đồng thuộc loại này');
    }

    const pending = await this.requestRepository.findOne({
      where: { MaDT: maDT, MaLoaiHoiDong: dto.MaLoaiHoiDong, TrangThai: 'Chờ duyệt' },
    });
    if (pending) {
      throw new BadRequestException('Đề tài đã có yêu cầu phân công hội đồng đang chờ Admin xử lý');
    }

    const request = await this.requestRepository.save(
      this.requestRepository.create({
        MaDT: maDT,
        MaLoaiHoiDong: dto.MaLoaiHoiDong,
        TaiKhoanNguoiGui: sender,
        LyDoYeuCau: dto.LyDoYeuCau?.trim() || undefined,
        YeuCauGocId: originalRequestId,
        TrangThai: 'Chờ duyệt',
      }),
    );

    if (councilType.NghiepVu === 'approval') {
      project.TrangThai = 'Chờ phân công hội đồng xét duyệt';
      await this.projectRepository.save(project);
    }
    if (councilType.NghiepVu === 'scoring') {
      project.TrangThai = 'Chờ phân công hội đồng nghiệm thu';
      await this.projectRepository.save(project);
    }

    await this.notifyAdmins(
      sender,
      'Có yêu cầu phân công hội đồng',
      `Đề tài "${project.TenDT}" yêu cầu phân công ${councilType.TenLoaiHoiDong}.`,
    );
    return this.findRequest(request.Id);
  }

  async resubmitAssignmentRequest(id: number, sender: string, dto: CreateCouncilAssignmentRequestDto) {
    const request = await this.findRequest(id);
    if (request.TaiKhoanNguoiGui !== sender) {
      throw new ForbiddenException('Bạn không có quyền gửi lại yêu cầu này');
    }
    if (request.TrangThai !== 'Từ chối') {
      throw new BadRequestException('Chỉ được gửi lại yêu cầu đã bị từ chối');
    }
    if (request.MaLoaiHoiDong !== dto.MaLoaiHoiDong) {
      throw new BadRequestException('Không được thay đổi loại hội đồng khi gửi lại yêu cầu');
    }
    return this.createAssignmentRequest(request.MaDT, sender, dto, request.Id);
  }

  findMyRequests(sender: string) {
    return this.requestRepository.find({
      where: { TaiKhoanNguoiGui: sender },
      relations: ['DeTai', 'LoaiHoiDong', 'HoiDong', 'NguoiXuLy'],
      order: { NgayGui: 'DESC', Id: 'DESC' },
    });
  }

  findRequests(status?: string) {
    return this.requestRepository.find({
      where: status ? { TrangThai: status } : {},
      relations: ['DeTai', 'LoaiHoiDong', 'HoiDong', 'NguoiGui', 'NguoiXuLy'],
      order: { NgayGui: 'DESC', Id: 'DESC' },
    });
  }

  async approveAssignmentRequest(id: number, councilId: number, adminAccount: string) {
    const request = await this.findRequest(id);
    if (request.TrangThai !== 'Chờ duyệt') {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }
    const council = await this.findOne(councilId);
    if (council.MaLoaiHoiDong !== request.MaLoaiHoiDong) {
      throw new BadRequestException('Hội đồng được chọn không đúng loại theo yêu cầu');
    }

    await this.assignToProject(request.MaDT, { MaHoiDong: councilId });
    request.TrangThai = 'Đã chấp nhận';
    request.MaHoiDong = councilId;
    request.TaiKhoanNguoiXuLy = adminAccount;
    request.NgayXuLy = new Date();
    await this.requestRepository.save(request);

    const project = await this.getProject(request.MaDT);
    if (council.LoaiHoiDong.NghiepVu === 'approval') {
      // Dùng chung trạng thái đã có của luồng xét duyệt để FE và dữ liệu cũ thống nhất.
      project.TrangThai = 'Chờ phê duyệt';
      await this.projectRepository.save(project);
    }
    if (council.LoaiHoiDong.NghiepVu === 'scoring') {
      project.TrangThai = 'Chờ nghiệm thu';
      await this.projectRepository.save(project);
    }

    await this.notifications.create(
      { TaiKhoan: adminAccount },
      {
        TkNguoiNhan: request.TaiKhoanNguoiGui,
        TieuDe: 'Yêu cầu phân công hội đồng đã được chấp nhận',
        NoiDung: `Đề tài "${project.TenDT}" đã được gán ${council.TenHoiDong}.`,
        NgayTao: new Date(),
      },
    );
    return this.findRequest(id);
  }

  async rejectAssignmentRequest(id: number, dto: RejectCouncilAssignmentRequestDto, adminAccount: string) {
    const request = await this.findRequest(id);
    if (request.TrangThai !== 'Chờ duyệt') {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    request.TrangThai = 'Từ chối';
    request.LyDoTuChoi = dto.LyDoTuChoi.trim();
    request.TaiKhoanNguoiXuLy = adminAccount;
    request.NgayXuLy = new Date();
    await this.requestRepository.save(request);

    const project = await this.getProject(request.MaDT);
    if (request.LoaiHoiDong.NghiepVu === 'approval') {
      project.TrangThai = 'Nháp';
      await this.projectRepository.save(project);
    }

    await this.notifications.create(
      { TaiKhoan: adminAccount },
      {
        TkNguoiNhan: request.TaiKhoanNguoiGui,
        TieuDe: 'Yêu cầu phân công hội đồng bị từ chối',
        NoiDung: `Đề tài "${project.TenDT}" bị từ chối phân công ${request.LoaiHoiDong.TenLoaiHoiDong}. Lý do: ${request.LyDoTuChoi}`,
        NgayTao: new Date(),
      },
    );
    return this.findRequest(id);
  }

  findTypes() {
    return this.councilTypeRepository.find({ order: { TenLoaiHoiDong: 'ASC' } });
  }

  async createType(dto: CreateCouncilTypeDto) {
    const name = dto.TenLoaiHoiDong.trim();
    const existing = await this.councilTypeRepository.findOne({ where: { TenLoaiHoiDong: name } });
    if (existing) throw new BadRequestException('Loại hội đồng đã tồn tại');
    return this.councilTypeRepository.save(
      this.councilTypeRepository.create({
        TenLoaiHoiDong: name,
        NghiepVu: dto.NghiepVu ?? 'other',
        MoTa: dto.MoTa?.trim() || undefined,
      }),
    );
  }

  async updateType(id: number, dto: UpdateCouncilTypeDto) {
    await this.findType(id);
    if (dto.TenLoaiHoiDong !== undefined) {
      const existing = await this.councilTypeRepository.findOne({
        where: { TenLoaiHoiDong: dto.TenLoaiHoiDong.trim() },
      });
      if (existing && existing.MaLoaiHoiDong !== id) {
        throw new BadRequestException('Loại hội đồng đã tồn tại');
      }
    }
    await this.councilTypeRepository.update(
      { MaLoaiHoiDong: id },
      {
        ...(dto.TenLoaiHoiDong !== undefined ? { TenLoaiHoiDong: dto.TenLoaiHoiDong.trim() } : {}),
        ...(dto.NghiepVu !== undefined ? { NghiepVu: dto.NghiepVu } : {}),
        ...(dto.MoTa !== undefined ? { MoTa: dto.MoTa.trim() || null } : {}),
      },
    );
    return this.findType(id);
  }

  async removeType(id: number) {
    const councilCount = await this.councilRepository.count({ where: { MaLoaiHoiDong: id } });
    if (councilCount > 0) {
      throw new BadRequestException('Không thể xóa loại hội đồng đang có hội đồng sử dụng');
    }
    const result = await this.councilTypeRepository.delete({ MaLoaiHoiDong: id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy loại hội đồng');
    return { message: 'Đã xóa loại hội đồng' };
  }

  async findType(id: number) {
    const type = await this.councilTypeRepository.findOne({ where: { MaLoaiHoiDong: id } });
    if (!type) throw new NotFoundException('Không tìm thấy loại hội đồng');
    return type;
  }

  private async findRequest(id: number) {
    const request = await this.requestRepository.findOne({
      where: { Id: id },
      relations: ['DeTai', 'LoaiHoiDong', 'HoiDong', 'NguoiGui', 'NguoiXuLy'],
    });
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu phân công hội đồng');
    }
    return request;
  }

  private async getProject(maDT: string) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài');
    }
    return project;
  }

  private async ensureProjectLeader(maDT: string, account: string) {
    const member = await this.projectMemberRepository.findOne({
      where: { MaDT: maDT, TaiKhoan: account },
    });
    if (!member || !this.normalize(member.VaiTroDT).includes('nhom truong')) {
      throw new ForbiddenException('Chỉ nhóm trưởng đề tài được gửi yêu cầu phân công hội đồng');
    }
  }

  private async ensureRequestAllowed(project: DeTai, business: string) {
    if (business === 'approval' && !['Nháp', 'Từ chối'].includes(project.TrangThai)) {
      throw new BadRequestException('Chỉ đề tài ở trạng thái Nháp hoặc Từ chối mới được yêu cầu hội đồng xét duyệt');
    }
    if (business === 'monitoring' && !['Đã phê duyệt', 'Bắt đầu'].includes(project.TrangThai)) {
      throw new BadRequestException('Chỉ đề tài đã bắt đầu mới được yêu cầu hội đồng theo dõi');
    }
    if (business === 'scoring' && project.TrangThai !== 'Chờ nghiệm thu') {
      throw new BadRequestException('Chỉ đề tài ở trạng thái Chờ nghiệm thu mới được yêu cầu hội đồng nghiệm thu');
    }
  }

  private async notifyAdmins(sender: string, title: string, content: string) {
    const users = await this.userRepository.find();
    const admins = users.filter((user) => {
      const role = this.normalize(user.VaiTro);
      return role === 'admin' || role === 'quan tri';
    });
    await Promise.all(admins.map((admin) => this.notifications.create(
      { TaiKhoan: sender },
      {
        TkNguoiNhan: admin.TaiKhoan,
        TieuDe: title,
        NoiDung: content,
        NgayTao: new Date(),
      },
    )));
  }

  private async removeAcceptanceScores(councilId: number, taiKhoan: string) {
    const assignments = await this.assignmentRepository.find({
      where: { MaHoiDong: councilId },
    });

    // Các đề tài cũ có thể chưa được backfill sang HoiDongDeTai.
    // Khi đó, lịch sử XetDuyetDeTai loại "Chấm điểm" là nguồn để xác định
    // đề tài mà thành viên này đã được giao chấm.
    const legacyReviews = await this.legacyApprovalRepository.find({
      where: { TaiKhoanHoiDong: taiKhoan },
    });
    const legacyProjectCodes = legacyReviews
      .filter((review) => {
        const isScoring = this.normalize(review.LoaiHoiDong).includes('cham diem');
        const belongsToCouncil =
          review.MaHoiDong === councilId || review.MaHoiDong === null || review.MaHoiDong === undefined;
        return isScoring && belongsToCouncil;
      })
      .map((review) => review.MaDT);

    const projectCodes = [
      ...new Set([
        ...assignments.map((assignment) => assignment.MaDT),
        ...legacyProjectCodes,
      ]),
    ];
    if (!projectCodes.length) {
      return 0;
    }

    const dossiers = await this.acceptanceDossierRepository.find({
      where: { MaDT: In(projectCodes) },
    });
    const dossierIds = dossiers.map((dossier) => dossier.Id);
    if (!dossierIds.length) {
      return 0;
    }

    const result = await this.acceptanceScoreRepository.delete({
      MaHoSoNghiemThu: In(dossierIds),
      TaiKhoanHoiDong: taiKhoan,
    });

    await Promise.all(
      dossiers.map(async (dossier) => {
        const remainingScores = await this.acceptanceScoreRepository.find({
          where: {
            MaHoSoNghiemThu: dossier.Id,
            TrangThai: 'Đã gửi',
          },
        });
        const average = remainingScores.length
          ? Number(
            (
              remainingScores.reduce(
                (sum, score) => sum + Number(score.Diem),
                0,
              ) / remainingScores.length
            ).toFixed(2),
          )
          : undefined;

        await this.acceptanceDossierRepository.update(dossier.Id, {
          DiemTrungBinh: average,
        });
      }),
    );

    return result.affected ?? 0;
  }

  private normalize(value?: string) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim();
  }
}
