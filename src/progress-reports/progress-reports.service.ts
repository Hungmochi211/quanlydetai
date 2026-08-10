import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentsService } from 'src/documents/documents.service';
import { CreateProgressReportDto, FinalizeProgressReportDto, ReviewProgressReportDto, UpdateProgressReportDto } from 'src/dto/ProgressReportDto';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { BaoCaoTienDo } from 'src/entity/progress-report.entity';
import { PhanHoiBaoCaoTienDo } from 'src/entity/progress-report-review.entity';
import { DeTai } from 'src/entity/project.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { In, Repository } from 'typeorm';

const EDITABLE_STATUSES = ['Nháp', 'Yêu cầu bổ sung'];
const REPORTABLE_PROJECT_STATUSES = ['Đã phê duyệt', 'Bắt đầu', 'Đang thực hiện'];
const MILESTONE_REPORT_TYPE = 'Theo mốc';

@Injectable()
export class ProgressReportsService {
  constructor(
    @InjectRepository(BaoCaoTienDo)
    private readonly reportRepository: Repository<BaoCaoTienDo>,
    @InjectRepository(PhanHoiBaoCaoTienDo)
    private readonly reportReviewRepository: Repository<PhanHoiBaoCaoTienDo>,
    @InjectRepository(DeTai)
    private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(ThanhVienDT)
    private readonly projectMemberRepository: Repository<ThanhVienDT>,
    @InjectRepository(MocDeTai)
    private readonly milestoneRepository: Repository<MocDeTai>,
    @InjectRepository(TaiLieu)
    private readonly documentRepository: Repository<TaiLieu>,
    @InjectRepository(HoiDongDeTai)
    private readonly councilAssignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(ThanhVienHoiDong)
    private readonly councilMemberRepository: Repository<ThanhVienHoiDong>,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(maDT: string, dto: CreateProgressReportDto, taiKhoan: string) {
    const project = await this.getProjectOrThrow(maDT);
    await this.ensureLeader(maDT, taiKhoan);
    this.ensureProjectCanReport(project);
    let maMoc: number | undefined;
    let kyBaoCao: string;
    if (dto.LoaiBaoCao === MILESTONE_REPORT_TYPE) {
      if (!dto.MaMoc) throw new BadRequestException('Báo cáo theo mốc phải chọn mốc tiến độ');
      const milestone = await this.getMilestoneOrThrow(dto.MaMoc, project.MaDT);
      const existingReport = await this.reportRepository.findOne({ where: { MaDT: project.MaDT, MaMoc: milestone.MaMoc } });
      if (existingReport) throw new BadRequestException('Mốc này đã có hồ sơ báo cáo. Hãy chỉnh sửa hoặc gửi lại hồ sơ hiện có.');
      maMoc = milestone.MaMoc;
      kyBaoCao = `Báo cáo mốc: ${milestone.TenMoc}`;
    } else {
      kyBaoCao = dto.KyBaoCao?.trim() || '';
      if (!kyBaoCao) throw new BadRequestException('Báo cáo định kỳ hoặc đột xuất phải nhập kỳ/tiêu đề báo cáo');
    }

    const report = this.reportRepository.create({
      MaDT: project.MaDT,
      MaMoc: maMoc,
      LoaiBaoCao: dto.LoaiBaoCao,
      KyBaoCao: kyBaoCao,
      NoiDungBaoCao: dto.NoiDungBaoCao.trim(),
      TienDoBaoCao: dto.TienDoBaoCao,
      KhoKhan: dto.KhoKhan?.trim() || undefined,
      DeXuat: dto.DeXuat?.trim() || undefined,
      TaiKhoanNguoiGui: taiKhoan,
      TrangThai: 'Nháp',
    });
    return this.reportRepository.save(report);
  }

  async findByProject(maDT: string, taiKhoan: string) {
    await this.ensureCanViewProject(maDT, taiKhoan);
    return this.reportRepository.find({
      where: { MaDT: maDT },
      relations: ['NguoiGui', 'NguoiHoiDong', 'MocDeTai', 'TaiLieu', 'PhanHoi', 'PhanHoi.NguoiHoiDong'],
      order: { NgayTao: 'DESC' },
    });
  }

  async findMonitoringProjects(taiKhoan: string) {
    return (await this.findCouncilProjects(taiKhoan))
      .filter((project) => project.NghiepVuHoiDong === 'monitoring');
  }

  async findCouncilProjects(taiKhoan: string) {
    const councilMembers = await this.councilMemberRepository.find({ where: { TaiKhoan: taiKhoan } });
    const councilIds = councilMembers.map((member) => member.MaHoiDong);
    if (councilIds.length === 0) return [];

    const assignments = await this.councilAssignmentRepository.find({
      where: { MaHoiDong: In(councilIds) },
      relations: ['LoaiHoiDong', 'HoiDong', 'HoiDong.ThanhVienHoiDong', 'HoiDong.ThanhVienHoiDong.NguoiDung', 'DeTai'],
    });
    const projectAssignments = assignments.filter((assignment) => assignment.DeTai);
    // Một tài khoản có thể thuộc nhiều hội đồng của cùng một đề tài
    // (ví dụ: xét duyệt và nghiệm thu). Chỉ gộp bản ghi trùng cùng nghiệp vụ,
    // không gộp toàn bộ theo MaDT vì sẽ làm mất chức năng của hội đồng khác.
    const uniqueAssignments = [
      ...new Map(
        projectAssignments.map((assignment) => [
          `${assignment.MaDT}-${assignment.LoaiHoiDong?.NghiepVu || assignment.MaLoaiHoiDong}`,
          assignment,
        ]),
      ).values(),
    ];
    const uniqueProjects = uniqueAssignments.map((assignment) => assignment.DeTai);
    const leaders = uniqueProjects.length > 0
      ? await this.projectMemberRepository.find({
          where: { MaDT: In(uniqueProjects.map((project) => project.MaDT)) },
          relations: ['NguoiDung'],
        })
      : [];
    return uniqueAssignments.map((assignment) => {
      const project = assignment.DeTai;
      const leader = leaders.find(
        (member) => member.MaDT === project.MaDT && this.normalize(member.VaiTroDT).includes('nhom truong'),
      );
      return {
        MaDT: project.MaDT,
        MaHoiDong: assignment.MaHoiDong,
        TenDT: project.TenDT,
        Khoa: project.Khoa,
        TienDo: Number(project.TienDo || 0),
        TrangThai: project.TrangThai,
        ChuNhiem: leader?.NguoiDung?.TenDayDu || leader?.TaiKhoan || '—',
        TenHoiDong: assignment.HoiDong?.TenHoiDong,
        NghiepVuHoiDong: assignment.LoaiHoiDong?.NghiepVu,
        VaiTroTrongHoiDong: assignment.HoiDong?.ThanhVienHoiDong.find(
          (member) => member.TaiKhoan === taiKhoan,
        )?.ChucDanh || 'Thành viên',
        ThanhVienHoiDong: assignment.HoiDong?.ThanhVienHoiDong.map((member) => ({
          TaiKhoan: member.TaiKhoan,
          TenDayDu: member.NguoiDung?.TenDayDu || member.TaiKhoan,
          ChucDanh: member.ChucDanh,
        })) || [],
      };
    });
  }

  async getCouncilMembership(taiKhoan: string) {
    return {
      isCouncilMember: (await this.councilMemberRepository.count({ where: { TaiKhoan: taiKhoan } })) > 0,
    };
  }

  async findOne(id: number, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    await this.ensureCanViewProject(report.MaDT, taiKhoan);
    return report;
  }

  async update(id: number, dto: UpdateProgressReportDto, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    await this.ensureLeader(report.MaDT, taiKhoan);
    this.ensureEditable(report);

    if (dto.NoiDungBaoCao !== undefined) report.NoiDungBaoCao = dto.NoiDungBaoCao.trim();
    if (dto.TienDoBaoCao !== undefined) report.TienDoBaoCao = dto.TienDoBaoCao;
    if (dto.KhoKhan !== undefined) report.KhoKhan = dto.KhoKhan.trim() || undefined;
    if (dto.DeXuat !== undefined) report.DeXuat = dto.DeXuat.trim() || undefined;

    return this.reportRepository.save(report);
  }

  async remove(id: number, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    await this.ensureLeader(report.MaDT, taiKhoan);
    this.ensureEditable(report);
    await this.documentsService.removeByProgressReport(report.Id);
    await this.reportRepository.remove(report);
    return { message: 'Đã xóa báo cáo tiến độ' };
  }

  async submit(id: number, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    const project = await this.getProjectOrThrow(report.MaDT);
    await this.ensureLeader(report.MaDT, taiKhoan);
    this.ensureProjectCanReport(project);
    this.ensureEditable(report);

    const documentCount = await this.documentRepository.count({
      where: { MaBaoCaoTienDo: report.Id },
    });
    if (documentCount === 0) {
      throw new BadRequestException('Cần đính kèm ít nhất một tài liệu minh chứng trước khi gửi báo cáo');
    }
    const reviewers = await this.getMonitoringMembers(report.MaDT);
    if (reviewers.length === 0) {
      throw new BadRequestException('Đề tài chưa được gán hội đồng theo dõi có thành viên');
    }

    await this.reportRepository.update(report.Id, {
      TrangThai: 'Đã gửi',
      NgayGui: new Date(),
      NhanXetHoiDong: undefined,
      TaiKhoanHoiDong: undefined,
      NgayPhanHoi: undefined,
    });

    await Promise.all(
      reviewers.map((TaiKhoan) =>
        this.notificationsService.create(
          { TaiKhoan: taiKhoan },
          {
            TkNguoiNhan: TaiKhoan,
            TieuDe: 'Có báo cáo tiến độ cần theo dõi',
            NoiDung: `Đề tài "${project.TenDT}" đã gửi ${report.KyBaoCao}.`,
            NgayTao: new Date(),
          },
        ),
      ),
    );
    return this.getReportOrThrow(id);
  }

  async review(id: number, dto: ReviewProgressReportDto, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    if (report.TrangThai !== 'Đã gửi') {
      throw new BadRequestException('Chỉ phản hồi báo cáo đang ở trạng thái Đã gửi');
    }
    await this.ensureMonitoringMember(report.MaDT, taiKhoan);

    const suggestion = dto.decision
      ? {
          accepted: 'Đề xuất đạt',
          supplement: 'Đề xuất bổ sung',
          rejected: 'Đề xuất không đạt',
        }[dto.decision]
      : 'Nhận xét';
    await this.reportReviewRepository.save(this.reportReviewRepository.create({
      MaBaoCaoTienDo: report.Id,
      TaiKhoanHoiDong: taiKhoan,
      KetQua: suggestion,
      NhanXet: dto.note.trim(),
    }));

    await this.notificationsService.create(
      { TaiKhoan: taiKhoan },
      {
        TkNguoiNhan: report.TaiKhoanNguoiGui,
        TieuDe: 'Có nhận xét mới cho báo cáo tiến độ',
        NoiDung: `Báo cáo ${report.KyBaoCao} có nhận xét mới: ${dto.note.trim()}`,
        NgayTao: new Date(),
      },
    );
    return this.getReportOrThrow(id);
  }

  async finalize(id: number, dto: FinalizeProgressReportDto, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    if (report.TrangThai !== 'Đã gửi') {
      throw new BadRequestException('Chỉ được chốt báo cáo đang ở trạng thái Đã gửi');
    }

    await this.ensureMonitoringChairman(report.MaDT, taiKhoan);
    const status = {
      accepted: 'Đạt',
      supplement: 'Yêu cầu bổ sung',
      adjustment: 'Yêu cầu điều chỉnh',
      liquidation: 'Đề xuất thanh lý',
    }[dto.decision];

    await this.reportRepository.update(report.Id, {
      TrangThai: status,
      NhanXetHoiDong: dto.note.trim(),
      TaiKhoanHoiDong: taiKhoan,
      NgayPhanHoi: new Date(),
    });

    await this.notificationsService.create(
      { TaiKhoan: taiKhoan },
      {
        TkNguoiNhan: report.TaiKhoanNguoiGui,
        TieuDe: 'Kết luận báo cáo tiến độ',
        NoiDung: `Báo cáo ${report.KyBaoCao} được Chủ tịch hội đồng theo dõi kết luận: ${status}. ${dto.note.trim()}`,
        NgayTao: new Date(),
      },
    );
    return this.getReportOrThrow(id);
  }

  private async getReportOrThrow(id: number) {
    const report = await this.reportRepository.findOne({
      where: { Id: id },
      relations: ['NguoiGui', 'NguoiHoiDong', 'MocDeTai', 'TaiLieu', 'PhanHoi', 'PhanHoi.NguoiHoiDong'],
    });
    if (!report) throw new NotFoundException(`Không tìm thấy báo cáo tiến độ với id = ${id}`);
    return report;
  }

  private async getProjectOrThrow(maDT: string) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài');
    return project;
  }

  private async getMilestoneOrThrow(maMoc: number, maDT: string) {
    const milestone = await this.milestoneRepository.findOne({ where: { MaMoc: maMoc } });
    if (!milestone || milestone.MaDT !== maDT) {
      throw new BadRequestException('Mốc tiến độ không thuộc đề tài này');
    }
    return milestone;
  }

  private async ensureLeader(maDT: string, taiKhoan: string) {
    const member = await this.projectMemberRepository.findOne({ where: { MaDT: maDT, TaiKhoan: taiKhoan } });
    const role = this.normalize(member?.VaiTroDT);
    if (!member || !role.includes('nhom truong')) {
      throw new ForbiddenException('Chỉ nhóm trưởng được thao tác báo cáo tiến độ');
    }
  }

  private ensureProjectCanReport(project: DeTai) {
    if (!REPORTABLE_PROJECT_STATUSES.includes(project.TrangThai)) {
      throw new BadRequestException('Chỉ đề tài đã phê duyệt hoặc đang thực hiện mới được báo cáo tiến độ');
    }
  }

  private ensureEditable(report: BaoCaoTienDo) {
    if (!EDITABLE_STATUSES.includes(report.TrangThai)) {
      throw new BadRequestException('Chỉ được sửa hoặc xóa báo cáo ở trạng thái Nháp hoặc Yêu cầu bổ sung');
    }
  }

  private async ensureCanViewProject(maDT: string, taiKhoan: string) {
    const member = await this.projectMemberRepository.findOne({ where: { MaDT: maDT, TaiKhoan: taiKhoan } });
    if (member) return;
    await this.ensureMonitoringMember(maDT, taiKhoan);
  }

  private async ensureMonitoringMember(maDT: string, taiKhoan: string) {
    const reviewers = await this.getMonitoringMembers(maDT);
    if (!reviewers.includes(taiKhoan)) {
      throw new ForbiddenException('Bạn không thuộc hội đồng theo dõi của đề tài này');
    }
  }

  private async ensureMonitoringChairman(maDT: string, taiKhoan: string) {
    const councilIds = (await this.getMonitoringAssignments(maDT))
      .map((assignment) => assignment.MaHoiDong);
    const member = councilIds.length
      ? await this.councilMemberRepository.findOne({
          where: councilIds.map((MaHoiDong) => ({ MaHoiDong, TaiKhoan: taiKhoan })),
        })
      : null;

    if (!member || !this.normalize(member.ChucDanh).includes('chu tich')) {
      throw new ForbiddenException(
        'Chỉ Chủ tịch hội đồng theo dõi được chốt kết luận báo cáo',
      );
    }
  }

  private async getMonitoringMembers(maDT: string): Promise<string[]> {
    const monitoringCouncilIds = (await this.getMonitoringAssignments(maDT))
      .map((assignment) => assignment.MaHoiDong);
    if (monitoringCouncilIds.length === 0) return [];

    const members = await this.councilMemberRepository
      .createQueryBuilder('member')
      .where('member.MaHoiDong IN (:...ids)', { ids: monitoringCouncilIds })
      .getMany();
    return [...new Set(members.map((member) => member.TaiKhoan))];
  }

  private async getMonitoringAssignments(maDT: string) {
    const assignments = await this.councilAssignmentRepository.find({
      where: { MaDT: maDT },
      relations: ['LoaiHoiDong'],
    });
    return assignments.filter(
      (assignment) => assignment.LoaiHoiDong?.NghiepVu === 'monitoring',
    );
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
