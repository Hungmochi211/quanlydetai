import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentsService } from 'src/documents/documents.service';
import { CreateProgressReportDto, FinalizeProgressReportDto, ReviewProgressReportDto, UpdateProgressReportDto } from 'src/dto/ProgressReportDto';
import { HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong, YeuCauPhanCongHoiDong } from 'src/entity/council.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { BaoCaoTienDo } from 'src/entity/progress-report.entity';
import { PhanHoiBaoCaoTienDo } from 'src/entity/progress-report-review.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { In, Repository } from 'typeorm';

const EDITABLE_STATUSES = ['Nháp', 'Yêu cầu bổ sung'];
const REPORTABLE_PROJECT_STATUSES = ['Đã phê duyệt', 'Bắt đầu', 'Đang thực hiện'];
const MILESTONE_BASED_REPORT_TYPES = ['Theo mốc', 'Nghiệm thu từng phần'];
const PARTIAL_ACCEPTANCE_TYPE = 'Nghiệm thu từng phần';

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
    @InjectRepository(LoaiHoiDong)
    private readonly councilTypeRepository: Repository<LoaiHoiDong>,
    @InjectRepository(YeuCauPhanCongHoiDong)
    private readonly councilRequestRepository: Repository<YeuCauPhanCongHoiDong>,
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(maDT: string, dto: CreateProgressReportDto, taiKhoan: string) {
    const project = await this.getProjectOrThrow(maDT);
    await this.ensureLeader(maDT, taiKhoan);
    this.ensureProjectCanReport(project);
    let maMoc: number | undefined;
    let kyBaoCao: string;
    if (MILESTONE_BASED_REPORT_TYPES.includes(dto.LoaiBaoCao)) {
      if (!dto.MaMoc) throw new BadRequestException('Hồ sơ theo mốc phải chọn mốc tiến độ');
      const milestone = await this.getMilestoneOrThrow(dto.MaMoc, project.MaDT);
      if (dto.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE && milestone.TrangThai !== 'Hoàn thành') {
        throw new BadRequestException('Chỉ mốc có trạng thái Hoàn thành mới được tạo hồ sơ nghiệm thu từng phần');
      }
      const existingReport = await this.reportRepository.findOne({
        where: { MaDT: project.MaDT, MaMoc: milestone.MaMoc, LoaiBaoCao: dto.LoaiBaoCao },
      });
      if (existingReport) throw new BadRequestException('Mốc này đã có hồ sơ cùng loại. Hãy chỉnh sửa hoặc gửi lại hồ sơ hiện có.');
      maMoc = milestone.MaMoc;
      kyBaoCao = dto.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE
        ? `Nghiệm thu mốc: ${milestone.TenMoc}`
        : `Báo cáo mốc: ${milestone.TenMoc}`;
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

  async requestPartialAcceptanceCouncil(id: number, taiKhoan: string) {
    const report = await this.getReportOrThrow(id);
    await this.ensureLeader(report.MaDT, taiKhoan);
    if (report.LoaiBaoCao !== PARTIAL_ACCEPTANCE_TYPE) {
      throw new BadRequestException('Chỉ hồ sơ nghiệm thu từng phần mới được yêu cầu phân công hội đồng');
    }
    if (!EDITABLE_STATUSES.includes(report.TrangThai)) {
      throw new BadRequestException('Chỉ hồ sơ Nháp hoặc Yêu cầu bổ sung mới được gửi yêu cầu hội đồng');
    }
    if (report.TrangThaiPhanCongHoiDong === 'Đã phân công') {
      throw new BadRequestException('Hồ sơ đã được phân công Hội đồng nghiệm thu');
    }
    const pending = await this.councilRequestRepository.findOne({
      where: { MaBaoCaoTienDo: report.Id, TrangThai: 'Chờ duyệt' },
    });
    if (pending) throw new BadRequestException('Yêu cầu phân công Hội đồng đang chờ Admin xử lý');
    const councilType = await this.councilTypeRepository.findOne({ where: { NghiepVu: 'scoring' } });
    if (!councilType) throw new BadRequestException('Chưa có loại Hội đồng nghiệm thu trong hệ thống');
    const request = await this.councilRequestRepository.save(this.councilRequestRepository.create({
      MaDT: report.MaDT,
      MaBaoCaoTienDo: report.Id,
      MaLoaiHoiDong: councilType.MaLoaiHoiDong,
      TaiKhoanNguoiGui: taiKhoan,
      LyDoYeuCau: `Đề nghị phân công Hội đồng nghiệm thu cho ${report.KyBaoCao}.`,
      TrangThai: 'Chờ duyệt',
    }));
    await this.reportRepository.update(report.Id, { TrangThaiPhanCongHoiDong: 'Chờ xử lý', MaHoiDongNghiemThu: undefined });
    const admins = await this.userRepository.find({ where: { VaiTro: 'Admin' }, select: ['TaiKhoan'] });
    await Promise.all(admins.map((admin) => this.notificationsService.create(
      { TaiKhoan: taiKhoan },
      { TkNguoiNhan: admin.TaiKhoan, TieuDe: 'Có yêu cầu phân công Hội đồng nghiệm thu từng phần', NoiDung: `Đề tài "${report.MaDT}" yêu cầu phân công hội đồng cho ${report.KyBaoCao}.`, NgayTao: new Date() },
    )));
    return request;
  }

  async findMonitoringProjects(taiKhoan: string) {
    return (await this.findCouncilProjects(taiKhoan))
      .filter((project) => project.NghiepVuHoiDong === 'monitoring');
  }

  async findCouncilProjects(taiKhoan: string) {
    const councilMembers = await this.councilMemberRepository.find({
      where: { TaiKhoan: taiKhoan },
      relations: ['HoiDong', 'HoiDong.ThanhVienHoiDong', 'HoiDong.ThanhVienHoiDong.NguoiDung'],
    });
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
    const partialReports = await this.reportRepository.find({
      where: { LoaiBaoCao: PARTIAL_ACCEPTANCE_TYPE, MaHoiDongNghiemThu: In(councilIds) },
      relations: ['DeTai', 'MocDeTai'],
    });
    const allProjects = [
      ...uniqueAssignments.map((assignment) => assignment.DeTai),
      ...partialReports.map((report) => report.DeTai),
    ].filter(Boolean);
    const leaders = allProjects.length > 0
      ? await this.projectMemberRepository.find({
          where: { MaDT: In([...new Set(allProjects.map((project) => project.MaDT))]) },
          relations: ['NguoiDung'],
        })
      : [];
    const assignedProjects = uniqueAssignments.map((assignment) => {
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
        LoaiNghiemThu: assignment.LoaiHoiDong?.NghiepVu === 'scoring' ? 'toan-bo' : undefined,
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
    const partialAcceptanceProjects = partialReports.map((report) => {
      const project = report.DeTai;
      const council = councilMembers.find((member) => member.MaHoiDong === report.MaHoiDongNghiemThu)?.HoiDong;
      const leader = leaders.find((member) => member.MaDT === project.MaDT && this.normalize(member.VaiTroDT).includes('nhom truong'));
      return {
        MaBaoCaoTienDo: report.Id,
        MaDT: project.MaDT,
        MaHoiDong: report.MaHoiDongNghiemThu,
        TenDT: `${project.TenDT} — ${report.MocDeTai?.TenMoc || 'Nghiệm thu từng phần'}`,
        Khoa: project.Khoa,
        TienDo: Number(project.TienDo || 0),
        TrangThai: report.TrangThai,
        ChuNhiem: leader?.NguoiDung?.TenDayDu || leader?.TaiKhoan || '—',
        TenHoiDong: council?.TenHoiDong || 'Hội đồng nghiệm thu',
        NghiepVuHoiDong: 'scoring',
        LoaiNghiemThu: 'tung-phan',
        VaiTroTrongHoiDong: councilMembers.find((member) => member.MaHoiDong === report.MaHoiDongNghiemThu)?.ChucDanh || 'Thành viên',
        ThanhVienHoiDong: council?.ThanhVienHoiDong.map((member) => ({ TaiKhoan: member.TaiKhoan, TenDayDu: member.NguoiDung?.TenDayDu || member.TaiKhoan, ChucDanh: member.ChucDanh })) || [],
      };
    });
    return [...assignedProjects, ...partialAcceptanceProjects];
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
    const reviewers = report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE
      ? await this.getPartialAcceptanceMembers(report)
      : await this.getMonitoringMembers(report.MaDT);
    if (reviewers.length === 0) {
      throw new BadRequestException(report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE
        ? 'Hồ sơ chưa được Admin phân công Hội đồng nghiệm thu'
        : 'Đề tài chưa được gán hội đồng theo dõi có thành viên');
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
            TieuDe: report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE ? 'Có hồ sơ nghiệm thu từng phần cần xử lý' : 'Có báo cáo tiến độ cần theo dõi',
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
    await this.ensureReportReviewer(report, taiKhoan);

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

    await this.ensureReportFinalizer(report, taiKhoan);
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

    if (report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE && report.MaMoc && status === 'Đạt') {
      await this.milestoneRepository.update(report.MaMoc, { TrangThai: 'Đã nghiệm thu' });
      await this.updateProjectProgressFromAcceptedMilestones(report.MaDT);
    }

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
    if ((await this.getMonitoringMembers(maDT)).includes(taiKhoan)) return;
    const councilIds = (await this.councilMemberRepository.find({ where: { TaiKhoan: taiKhoan } }))
      .map((item) => item.MaHoiDong);
    if (councilIds.length && await this.reportRepository.findOne({
      where: { MaDT: maDT, LoaiBaoCao: PARTIAL_ACCEPTANCE_TYPE, MaHoiDongNghiemThu: In(councilIds) },
    })) return;
    throw new ForbiddenException('Bạn không có quyền xem báo cáo của đề tài này');
  }

  private async ensureMonitoringMember(maDT: string, taiKhoan: string) {
    const reviewers = await this.getMonitoringMembers(maDT);
    if (!reviewers.includes(taiKhoan)) {
      throw new ForbiddenException('Bạn không thuộc hội đồng theo dõi của đề tài này');
    }
  }

  private async ensureReportReviewer(report: BaoCaoTienDo, taiKhoan: string) {
    const reviewers = report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE
      ? await this.getPartialAcceptanceMembers(report)
      : await this.getMonitoringMembers(report.MaDT);
    if (!reviewers.includes(taiKhoan)) {
      throw new ForbiddenException(report.LoaiBaoCao === PARTIAL_ACCEPTANCE_TYPE
        ? 'Bạn không thuộc Hội đồng nghiệm thu của hồ sơ này'
        : 'Bạn không thuộc hội đồng theo dõi của đề tài này');
    }
  }

  private async ensureReportFinalizer(report: BaoCaoTienDo, taiKhoan: string) {
    if (report.LoaiBaoCao !== PARTIAL_ACCEPTANCE_TYPE) {
      return this.ensureMonitoringChairman(report.MaDT, taiKhoan);
    }
    if (!report.MaHoiDongNghiemThu) {
      throw new ForbiddenException('Hồ sơ chưa được phân công Hội đồng nghiệm thu');
    }
    const member = await this.councilMemberRepository.findOne({
      where: { MaHoiDong: report.MaHoiDongNghiemThu, TaiKhoan: taiKhoan },
    });
    const position = this.normalize(member?.ChucDanh);
    if (!member || (!position.includes('chu tich') && !position.includes('thu ky'))) {
      throw new ForbiddenException('Chỉ Chủ tịch hoặc Thư ký Hội đồng nghiệm thu được chốt kết luận');
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

  private async getPartialAcceptanceMembers(report: BaoCaoTienDo): Promise<string[]> {
    if (report.TrangThaiPhanCongHoiDong !== 'Đã phân công' || !report.MaHoiDongNghiemThu) return [];
    const members = await this.councilMemberRepository.find({ where: { MaHoiDong: report.MaHoiDongNghiemThu } });
    return members.map((member) => member.TaiKhoan);
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

  private async updateProjectProgressFromAcceptedMilestones(maDT: string) {
    const milestones = await this.milestoneRepository.find({ where: { MaDT: maDT } });
    const progress = milestones.reduce(
      (sum, milestone) => sum + (milestone.TrangThai === 'Đã nghiệm thu' ? Number(milestone.TrongSo || 0) : 0),
      0,
    );
    await this.projectRepository.update({ MaDT: maDT }, { TienDo: Math.min(100, Math.round(progress * 100) / 100) });
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
