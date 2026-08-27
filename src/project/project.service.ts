import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateDto } from 'src/dto/DateDto';
import { UpdateProjectDto } from 'src/dto/UpdateProjectDto';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { LichSuXetDuyetDeTai } from 'src/entity/project-approval-history.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { In, Repository } from 'typeorm';
import { ReviewProjectDto, SubmitProjectForApprovalDto } from 'src/dto/ProjectApprovalDto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AdminProjectQueryDto } from 'src/dto/AdminProjectQueryDto';
import { ChuyenNganh } from 'src/entity/spec.entity';
import { PhanLoai } from 'src/entity/speclist.entity';
import { NguoiHD } from 'src/entity/teacher.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(DeTai)
    private DTRes: Repository<DeTai>,

    @InjectRepository(ThanhVienDT)
    private TVDTRes: Repository<ThanhVienDT>,

    @InjectRepository(XetDuyetDeTai)
    private approvalRes: Repository<XetDuyetDeTai>,

    @InjectRepository(LichSuXetDuyetDeTai)
    private approvalHistoryRes: Repository<LichSuXetDuyetDeTai>,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,

    @InjectRepository(TaiLieu)
    private documentRes: Repository<TaiLieu>,

    @InjectRepository(HoiDongDeTai)
    private councilAssignmentRes: Repository<HoiDongDeTai>,

    @InjectRepository(ThanhVienHoiDong)
    private councilMemberRes: Repository<ThanhVienHoiDong>,

    @InjectRepository(ChuyenNganh)
    private specializationRes: Repository<ChuyenNganh>,

    @InjectRepository(PhanLoai)
    private facultyRes: Repository<PhanLoai>,

    @InjectRepository(NguoiHD)
    private advisorRes: Repository<NguoiHD>,

    private readonly notificationsService: NotificationsService,
  ) { }

  private normalizeRole(role?: string) {
    return (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim();
  }

  private async ensureAdmin(taiKhoan: string) {
    const user = await this.userRes.findOne({ where: { TaiKhoan: taiKhoan } });
    if (this.normalizeRole(user?.VaiTro) !== 'admin') {
      throw new ForbiddenException('Chỉ tài khoản Admin được thực hiện thao tác này');
    }
  }

  async ensureProjectLeader(maDT: string, taiKhoan: string) {
    const member = await this.TVDTRes.findOne({ where: { MaDT: maDT, TaiKhoan: taiKhoan } });
    if (!member || !this.normalizeRole(member.VaiTroDT).includes('nhom truong')) {
      throw new ForbiddenException('Chỉ nhóm trưởng của đề tài được thực hiện thao tác này');
    }
  }

  private async ensureProjectManager(maDT: string, taiKhoan: string) {
    await this.ensureProjectLeader(maDT, taiKhoan);
  }

  private async ensureProjectCanBeEdited(
    project: DeTai,
    taiKhoan: string,
    allowRejectedProject = false,
  ) {
    await this.ensureProjectLeader(project.MaDT, taiKhoan);

    const editableStatuses = allowRejectedProject ? ['Nháp', 'Từ chối'] : ['Nháp'];
    if (!editableStatuses.includes(project.TrangThai)) {
      throw new BadRequestException(
        allowRejectedProject
          ? 'Chỉ được sửa đề tài ở trạng thái Nháp hoặc Từ chối'
          : 'Chỉ được xóa đề tài ở trạng thái Nháp',
      );
    }

    const submittedForApproval = await this.approvalRes.count({
      where: { MaDT: project.MaDT, LoaiHoiDong: 'Xét duyệt' },
    });
    if (submittedForApproval > 0 && project.TrangThai !== 'Từ chối') {
      throw new BadRequestException('Đề tài đã gửi Hội đồng xét duyệt nên không thể sửa hoặc xóa');
    }
  }

  private async archiveRejectedApprovalRound(
    maDT: string,
    reviewerAccount?: string,
  ): Promise<XetDuyetDeTai[]> {
    const currentApprovals = await this.approvalRes.find({
      where: { MaDT: maDT, LoaiHoiDong: 'Xét duyệt' },
    });
    const rejectedApprovals = currentApprovals.filter(
      (approval) => approval.TrangThai === 'Từ chối'
        && (!reviewerAccount || approval.TaiKhoanHoiDong === reviewerAccount),
    );

    if (rejectedApprovals.length === 0) return [];

    const latestHistory = await this.approvalHistoryRes.find({
      where: { MaDT: maDT },
      order: { LanXetDuyet: 'DESC', Id: 'DESC' },
      take: 1,
    });
    const nextRound = (latestHistory[0]?.LanXetDuyet ?? 0) + 1;

    await this.approvalHistoryRes.save(
      rejectedApprovals.map((approval) =>
        this.approvalHistoryRes.create({
          MaDT: approval.MaDT,
          LanXetDuyet: nextRound,
          TaiKhoanHoiDong: approval.TaiKhoanHoiDong,
          MaHoiDong: approval.MaHoiDong,
          LoaiHoiDong: approval.LoaiHoiDong,
          TrangThai: approval.TrangThai,
          GhiChu: approval.GhiChu,
          NgayTao: approval.NgayTao,
          NgayPhanHoi: approval.NgayPhanHoi,
        }),
      ),
    );
    await this.approvalRes.delete({
      MaDT: maDT,
      LoaiHoiDong: 'Xét duyệt',
      TrangThai: 'Từ chối',
      ...(reviewerAccount ? { TaiKhoanHoiDong: reviewerAccount } : {}),
    });

    return rejectedApprovals;
  }

  async registerProject(user: any, prDto: RegisterTopicDto) {
    //kiem tra de tai
    const detai = await this.DTRes.findOne({ where: { MaDT: prDto.MaDT } });

    if (detai) {
      throw new NotFoundException('Đề tài này đã tồn tại!');
    }

    let advisor = await this.advisorRes.findOne({
      where: [{ idNguoiHD: prDto.idNguoiHD }, { TaiKhoan: prDto.idNguoiHD }],
      relations: ['NguoiDung'],
    });
    const advisorAccount = advisor?.NguoiDung || await this.userRes.findOne({ where: { TaiKhoan: prDto.idNguoiHD } });
    if (!advisorAccount || this.normalizeRole(advisorAccount.VaiTro) !== 'giang vien') {
      throw new BadRequestException('Người hướng dẫn phải là tài khoản có vai trò Giảng viên');
    }
    if (!advisor) {
      advisor = await this.advisorRes.save(this.advisorRes.create({
        idNguoiHD: advisorAccount.TaiKhoan,
        TaiKhoan: advisorAccount.TaiKhoan,
        idChuyenNganh: prDto.ChuyenNganh,
      }));
    }

    const memberAccounts = [...new Set((prDto.ThanhVienIds || []).filter((account) => account && account !== user.TaiKhoan))];
    if (memberAccounts.length) {
      const students = await this.userRes.findBy({ TaiKhoan: In(memberAccounts) });
      if (students.length !== memberAccounts.length || students.some((member) => member.VaiTro !== 'Sinh viên')) {
        throw new BadRequestException('Thành viên đề tài phải là tài khoản có vai trò Sinh viên');
      }
    }

    //kiem tra nguoi dang ki
    const isRegister = await this.TVDTRes.findOne({
      where: { TaiKhoan: user.TaiKhoan, MaDT: prDto.MaDT },
    });

    if (isRegister) throw new BadRequestException('Bạn đã đăng ký đề tài này');

    //dang ki de tai
    const project = this.DTRes.create({
      MaDT: prDto.MaDT.trim(),
      TenDT: prDto.TenDT,
      ChuyenNganh: prDto.ChuyenNganh,
      Khoa: String(prDto.Khoa),
      PhanLoai: prDto.PhanLoai,
      idNguoiHD: advisor.idNguoiHD,
      MoTa: prDto.MoTa,
      TrangThai: 'Nháp',
      TienDo: 0,
      NgayTao: new Date(),
    });
    await this.DTRes.save(project);

    //dang ki nhom truong
    const leader = this.TVDTRes.create({
      MaDT: prDto.MaDT,
      TaiKhoan: user.TaiKhoan,
      VaiTroDT: 'Nhóm trưởng',
    });
    await this.TVDTRes.save(leader);

    //dang ki thanh vien
    for (const member of memberAccounts) {
      const mb = this.TVDTRes.create({
        MaDT: prDto.MaDT,
        TaiKhoan: member,
        VaiTroDT: 'Thành viên',
      });

      await this.TVDTRes.save(mb);
    }

    return { message: 'Yêu cầu đăng ký đề tài của bạn đã được gửi.' };
  }

  async getProject(taikhoan: string) {
    const result = await this.TVDTRes.createQueryBuilder('tv')
      .leftJoinAndSelect('tv.DeTai', 'dt')
      .where('tv.TaiKhoan =:taikhoan', { taikhoan })
      .getMany();

    return result;
  }

  async getAllForAdmin(taiKhoan: string, query: AdminProjectQueryDto) {
    await this.ensureAdmin(taiKhoan);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.DTRes.createQueryBuilder('project')
      .leftJoinAndSelect('project.ThanhVienDT', 'member')
      .leftJoinAndSelect('member.NguoiDung', 'user')
      .orderBy('project.NgayTao', 'DESC')
      .addOrderBy('project.MaDT', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.keyword?.trim()) {
      builder.andWhere(
        '(project.MaDT LIKE :keyword OR project.TenDT LIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }
    if (query.phanLoai?.trim()) {
      builder.andWhere('project.PhanLoai = :phanLoai', {
        phanLoai: query.phanLoai.trim(),
      });
    }
    if (query.trangThai?.trim()) {
      builder.andWhere('project.TrangThai = :trangThai', {
        trangThai: query.trangThai.trim(),
      });
    }

    const [data, total] = await builder.getManyAndCount();
    const isLeader = (role?: string) => {
      const normalizedRole = this.normalizeRole(role);
      return normalizedRole.includes('truong nhom') || normalizedRole.includes('nhom truong');
    };
    const leaderAccounts = [...new Set(
      data
        .flatMap((project) => project.ThanhVienDT || [])
        .filter((member) => isLeader(member.VaiTroDT))
        .map((member) => member.TaiKhoan),
    )];
    const leaders = leaderAccounts.length
      ? await this.userRes.findBy({ TaiKhoan: In(leaderAccounts) })
      : [];
    const leaderByAccount = new Map(leaders.map((leader) => [leader.TaiKhoan, leader]));

    const result = data.map((project) => {
      const leaderMember = project.ThanhVienDT?.find((member) => isLeader(member.VaiTroDT));
      const leader = leaderMember ? leaderByAccount.get(leaderMember.TaiKhoan) : undefined;

      return {
        ...project,
        NhomTruong: leaderMember
          ? {
            TaiKhoan: leaderMember.TaiKhoan,
            TenDayDu: leader?.TenDayDu || leaderMember.TaiKhoan,
          }
          : null,
      };
    });

    return { data: result, total, page, limit };
  }

  async lookupProjects(query: AdminProjectQueryDto) {
    if (!query.keyword?.trim()) {
      throw new BadRequestException('Vui lòng nhập tên đề tài để tra cứu');
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.DTRes.createQueryBuilder('project')
      .leftJoinAndSelect('project.NguoiHD', 'advisor')
      .leftJoinAndSelect('advisor.NguoiDung', 'advisorUser')
      .leftJoinAndSelect('project.ThanhVienDT', 'member')
      .leftJoinAndSelect('member.NguoiDung', 'memberUser')
      .select([
        'project.MaDT', 'project.TenDT', 'project.ChuyenNganh', 'project.Khoa',
        'project.PhanLoai', 'project.TrangThai', 'project.TienDo',
        // SQL Server requires every ORDER BY column to be selected when TypeORM
        // adds DISTINCT for pagination over the member joins.
        'project.NgayTao', 'project.NgayBatDau', 'project.NgayKetThuc', 'project.NgayXetDuyet', 'project.MoTa',
        'advisor.idNguoiHD', 'advisor.TaiKhoan', 'advisorUser.TaiKhoan', 'advisorUser.TenDayDu',
        'member.idTV', 'member.TaiKhoan', 'member.VaiTroDT', 'memberUser.TaiKhoan', 'memberUser.TenDayDu',
      ])
      .orderBy('project.NgayTao', 'DESC')
      .addOrderBy('project.MaDT', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.keyword?.trim()) {
      builder.andWhere(
        'project.TenDT LIKE :keyword',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }
    if (query.trangThai?.trim()) {
      builder.andWhere('project.TrangThai = :trangThai', { trangThai: query.trangThai.trim() });
    }
    if (query.khoa?.trim()) {
      builder.andWhere('project.Khoa = :khoa', { khoa: query.khoa.trim() });
    }
    if (query.namHoc?.trim()) {
      const startYear = Number(query.namHoc.slice(0, 4));
      if (Number.isInteger(startYear)) {
        builder.andWhere('YEAR(project.NgayTao) = :startYear', { startYear });
      }
    }

    const [data, total] = await builder.getManyAndCount();
    const specializationIds = [...new Set(
      data.map((project) => project.ChuyenNganh).filter((id): id is string => Boolean(id)),
    )];
    const facultyIds = [...new Set(
      data.map((project) => Number(project.Khoa)).filter((id) => Number.isInteger(id) && id > 0),
    )];
    const [specializations, faculties] = await Promise.all([
      specializationIds.length ? this.specializationRes.findBy({ idChuyenNganh: In(specializationIds) }) : [],
      facultyIds.length ? this.facultyRes.findBy({ idPhanLoai: In(facultyIds) }) : [],
    ]);
    const specializationNames = new Map<string, string>(
      specializations.map((item): [string, string] => [item.idChuyenNganh, item.TenChuyenNganh]),
    );
    const facultyNames = new Map<string, string>(
      faculties.map((item): [string, string] => [String(item.idPhanLoai), item.TenPhanLoai]),
    );
    const isLeader = (role?: string) => {
      const normalizedRole = this.normalizeRole(role);
      return normalizedRole.includes('truong nhom') || normalizedRole.includes('nhom truong');
    };
    return {
      data: data.map((project) => {
        const leader = project.ThanhVienDT?.find((member) => isLeader(member.VaiTroDT));
        return {
          ...project,
          TenChuyenNganh: specializationNames.get(project.ChuyenNganh) || project.ChuyenNganh,
          TenKhoa: facultyNames.get(String(project.Khoa)) || project.Khoa,
          NhomTruong: leader
            ? { TaiKhoan: leader.TaiKhoan, TenDayDu: leader.NguoiDung?.TenDayDu || leader.TaiKhoan }
            : null,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async getProjectById(id: string) {
    const project = await this.DTRes.findOne({
      where: { MaDT: id.trim() },
      relations: ['ThanhVienDT'],
    });
    return project;
  }

  async getProjectByState(state: string) {
    const role = 'Nhóm trưởng';
    const result = await this.DTRes.createQueryBuilder('dt')
      .leftJoinAndSelect('dt.ThanhVienDT', 'tv')
      .where('dt.TrangThai =:state', { state })
      .andWhere('tv.VaiTroDT =:role', { role })
      .getMany();

    return result;
  }

  async changeProjectState(id: string, state: string, taiKhoan: string) {
    if (state === 'Đã phê duyệt') {
      throw new BadRequestException(
        'Không thể phê duyệt trực tiếp. Mỗi hội đồng phải xác nhận qua luồng xét duyệt.',
      );
    }
    const changeProject = await this.DTRes.findOne({
      where: { MaDT: id },
    });

    if (!changeProject) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }
    await this.ensureProjectLeader(id, taiKhoan);
    changeProject.TrangThai = state;
    return this.DTRes.save(changeProject);
  }

  async submitForApproval(
    maDT: string,
    sender: string,
    dto: SubmitProjectForApprovalDto,
  ) {
    const project = await this.DTRes.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài này');
    await this.ensureProjectLeader(maDT, sender);

    if (dto.councilType !== 'approval' && dto.councilType !== 'scoring') {
      throw new BadRequestException('Loại hội đồng không hợp lệ');
    }

    const isScoringCouncil = dto.councilType === 'scoring';
    const councilType = isScoringCouncil ? 'Chấm điểm' : 'Xét duyệt';
    const councilRole = isScoringCouncil ? 'Hội đồng chấm điểm' : 'Hội đồng xét duyệt';
    const requiredCouncilBusiness = isScoringCouncil ? 'scoring' : 'approval';

    if (isScoringCouncil && project.TrangThai !== 'Đã phê duyệt') {
      throw new BadRequestException('Chỉ được gửi Hội đồng chấm điểm sau khi đề tài đã được phê duyệt');
    }

    const existingApprovals = await this.approvalRes.count({
      where: { MaDT: maDT, LoaiHoiDong: councilType },
    });
    const isResubmittingRejectedProject = !isScoringCouncil && project.TrangThai === 'Từ chối';
    if (existingApprovals > 0 && !isResubmittingRejectedProject) {
      throw new BadRequestException(`Đề tài đã được gửi ${councilRole} và không thể gửi lại`);
    }

    const rejectedApprovals = isResubmittingRejectedProject
      ? await this.archiveRejectedApprovalRound(maDT)
      : [];

    const assignments = await this.councilAssignmentRes.find({
      where: { MaDT: maDT },
      relations: ['LoaiHoiDong'],
    });
    const matchingAssignments = assignments.filter(
      (assignment) => assignment.LoaiHoiDong?.NghiepVu === requiredCouncilBusiness,
    );
    const assignment = dto.councilId !== undefined
      ? matchingAssignments.find((item) => item.MaHoiDong === dto.councilId)
      : matchingAssignments.length === 1
        ? matchingAssignments[0]
        : undefined;
    if (!assignment) {
      throw new BadRequestException(
        'Đề tài chưa được Admin phân công đúng hội đồng. Hãy gửi yêu cầu phân công hội đồng trước.',
      );
    }

    const councilId = assignment.MaHoiDong;
    const members = await this.councilMemberRes.find({
      where: { MaHoiDong: councilId },
      relations: ['NguoiDung'],
    });
    const committeeUsers = members.map((member) => member.NguoiDung).filter(Boolean);
    const rejectedAccounts = new Set(
      rejectedApprovals.map((approval) => approval.TaiKhoanHoiDong),
    );
    const reviewersToCreate = isResubmittingRejectedProject
      ? committeeUsers.filter((user) => rejectedAccounts.has(user.TaiKhoan))
      : committeeUsers;

    if (reviewersToCreate.length === 0) {
      throw new BadRequestException(
        isResubmittingRejectedProject
          ? 'Không còn thành viên từ chối nào thuộc hội đồng hiện tại để gửi lại'
            : 'Hội đồng được gán chưa có thành viên hợp lệ',
      );
    }

    await this.approvalRes.save(
      reviewersToCreate.map(({ TaiKhoan }) =>
        this.approvalRes.create({
          MaDT: maDT,
          TaiKhoanHoiDong: TaiKhoan,
          MaHoiDong: councilId,
          LoaiHoiDong: councilType,
          TrangThai: isScoringCouncil ? 'Chờ chấm điểm' : 'Chờ phê duyệt',
          GhiChu: dto.note?.trim() || undefined,
        }),
      ),
    );

    if (!isScoringCouncil) {
      project.TrangThai = 'Chờ phê duyệt';
      project.NgayXetDuyet = null;
      await this.DTRes.save(project);
    }

    await Promise.all(
      reviewersToCreate.map(({ TaiKhoan }) =>
        this.notificationsService.create(
          { TaiKhoan: sender },
          {
            TkNguoiNhan: TaiKhoan,
            TieuDe: isScoringCouncil ? 'Có đề tài chờ chấm điểm' : 'Có đề tài chờ xét duyệt',
            NoiDung: `Đề tài "${project.TenDT}" đang chờ bạn ${isScoringCouncil ? 'chấm điểm' : 'xét duyệt'}${isResubmittingRejectedProject ? ' lại' : ''}.${dto.note ? ` Ghi chú: ${dto.note}` : ''}`,
            NgayTao: new Date(),
          },
        ),
      ),
    );

    const summary = await this.getApprovalSummary(maDT);
    const reviewers = (await this.getApprovals(maDT))
      .filter((approval) => approval.LoaiHoiDong === councilType)
      .map((approval) => ({
        account: approval.TaiKhoanHoiDong,
        name: approval.NguoiDung.TenDayDu,
        status: approval.TrangThai,
        LoaiHoiDong: approval.LoaiHoiDong,
      }));
    return { ...summary, councilType, reviewers };
  }

  async resendApprovalToReviewer(
    maDT: string,
    reviewerAccount: string,
    sender: string,
    note?: string,
  ) {
    const project = await this.DTRes.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài này');
    await this.ensureProjectLeader(maDT, sender);

    const rejectedApproval = await this.approvalRes.findOne({
      where: {
        MaDT: maDT,
        TaiKhoanHoiDong: reviewerAccount,
        LoaiHoiDong: 'Xét duyệt',
        TrangThai: 'Từ chối',
      },
    });
    if (!rejectedApproval) {
      throw new BadRequestException(
        'Thành viên hội đồng này không có phiếu xét duyệt bị từ chối để gửi lại',
      );
    }

    const archivedApprovals = await this.archiveRejectedApprovalRound(
      maDT,
      reviewerAccount,
    );
    const archivedApproval = archivedApprovals[0];
    if (!archivedApproval) {
      throw new BadRequestException('Không thể lưu lịch sử phiếu xét duyệt bị từ chối');
    }

    await this.approvalRes.save(
      this.approvalRes.create({
        MaDT: maDT,
        TaiKhoanHoiDong: reviewerAccount,
        MaHoiDong: archivedApproval.MaHoiDong,
        LoaiHoiDong: 'Xét duyệt',
        TrangThai: 'Chờ phê duyệt',
        GhiChu: note?.trim() || undefined,
      }),
    );

    const currentApprovals = await this.approvalRes.find({
      where: { MaDT: maDT, LoaiHoiDong: 'Xét duyệt' },
    });
    project.TrangThai = currentApprovals.some((item) => item.TrangThai === 'Từ chối')
      ? 'Từ chối'
      : 'Chờ phê duyệt';
    await this.DTRes.save(project);

    await this.notificationsService.create(
      { TaiKhoan: sender },
      {
        TkNguoiNhan: reviewerAccount,
        TieuDe: 'Có đề tài gửi lại chờ xét duyệt',
        NoiDung: `Đề tài "${project.TenDT}" đã được gửi lại để bạn xét duyệt.${note?.trim() ? ` Ghi chú: ${note.trim()}` : ''}`,
        NgayTao: new Date(),
      },
    );

    return this.getApprovalSummary(maDT);
  }

  async reviewProject(maDT: string, reviewerAccount: string, dto: ReviewProjectDto) {
    if (dto.decision !== 'approved' && dto.decision !== 'rejected') {
      throw new BadRequestException('Quyết định xét duyệt không hợp lệ');
    }

    const approval = await this.approvalRes.findOne({
      where: { MaDT: maDT, TaiKhoanHoiDong: reviewerAccount, LoaiHoiDong: 'Xét duyệt' },
    });
    if (!approval) {
      throw new NotFoundException('Bạn không nằm trong danh sách hội đồng xét duyệt đề tài này');
    }
    if (approval.TrangThai !== 'Chờ phê duyệt') {
      throw new BadRequestException('Bạn đã phản hồi yêu cầu xét duyệt này');
    }

    approval.TrangThai = dto.decision === 'approved' ? 'Đã phê duyệt' : 'Từ chối';
    approval.GhiChu = dto.note?.trim() || undefined;
    approval.NgayPhanHoi = new Date();
    await this.approvalRes.save(approval);

    const project = await this.DTRes.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài này');

    const approvals = await this.approvalRes.find({ where: { MaDT: maDT, LoaiHoiDong: 'Xét duyệt' } });
    if (approvals.some((item) => item.TrangThai === 'Từ chối')) {
      project.TrangThai = 'Từ chối';
    } else if (approvals.length > 0 && approvals.every((item) => item.TrangThai === 'Đã phê duyệt')) {
      project.TrangThai = 'Đã phê duyệt';
      project.NgayXetDuyet = new Date();
    } else {
      project.TrangThai = 'Chờ phê duyệt';
    }
    await this.DTRes.save(project);

    if (dto.decision === 'rejected') {
      const leader = await this.getLeaderById(maDT);
      if (leader) {
        const reviewers = await this.userRes.find({
          where: { TaiKhoan: In([reviewerAccount]) },
        });
        const reviewerName = reviewers[0]?.TenDayDu || reviewerAccount;
        const reason = approval.GhiChu || 'Chưa cung cấp lý do cụ thể';

        await this.notificationsService.create(
          { TaiKhoan: reviewerAccount },
          {
            TkNguoiNhan: leader.TaiKhoan,
            TieuDe: 'Đề tài bị từ chối xét duyệt',
            NoiDung: `Hội đồng ${reviewerName} đã từ chối đề tài "${project.TenDT}". Lý do: ${reason}`,
            NgayTao: new Date(),
          },
        );
      }
    }

    return this.getApprovalSummary(maDT);
  }

  async getApprovals(maDT: string) {
    const approvals = await this.approvalRes.find({
      where: { MaDT: maDT },
      order: { NgayTao: 'ASC', Id: 'ASC' },
    });

    const accounts = approvals.map((approval) => approval.TaiKhoanHoiDong);
    const users = accounts.length > 0
      ? await this.userRes.find({ where: { TaiKhoan: In(accounts) } })
      : [];
    const namesByAccount = new Map(users.map((user) => [user.TaiKhoan, user.TenDayDu]));

    return approvals.map((approval) => ({
      ...approval,
      NguoiDung: {
        TaiKhoan: approval.TaiKhoanHoiDong,
        TenDayDu: namesByAccount.get(approval.TaiKhoanHoiDong) || approval.TaiKhoanHoiDong,
      },
    }));
  }

  async getApprovalHistory(maDT: string) {
    const history = await this.approvalHistoryRes.find({
      where: { MaDT: maDT, LoaiHoiDong: 'Xét duyệt' },
      order: { LanXetDuyet: 'DESC', NgayLuu: 'DESC', Id: 'DESC' },
    });

    const accounts = [...new Set(history.map((item) => item.TaiKhoanHoiDong))];
    const users = accounts.length
      ? await this.userRes.find({ where: { TaiKhoan: In(accounts) } })
      : [];
    const namesByAccount = new Map(users.map((user) => [user.TaiKhoan, user.TenDayDu]));

    return history.map((item) => ({
      ...item,
      NguoiDung: {
        TaiKhoan: item.TaiKhoanHoiDong,
        TenDayDu: namesByAccount.get(item.TaiKhoanHoiDong) || item.TaiKhoanHoiDong,
      },
    }));
  }

  private async getApprovalSummary(maDT: string) {
    const approvals = (await this.getApprovals(maDT))
      .filter((approval) => approval.LoaiHoiDong === 'Xét duyệt');
    const project = await this.DTRes.findOne({ where: { MaDT: maDT } });
    const approvedReviewers = approvals.filter((item) => item.TrangThai === 'Đã phê duyệt').length;
    return {
      projectStatus: project?.TrangThai,
      totalReviewers: approvals.length,
      approvedReviewers,
      pendingReviewers: approvals.filter((item) => item.TrangThai === 'Chờ phê duyệt').length,
      allApproved: approvals.length > 0 && approvedReviewers === approvals.length,
      reviewers: approvals.map((item) => ({
        account: item.TaiKhoanHoiDong,
        name: item.NguoiDung.TenDayDu,
        status: item.TrangThai,
      })),
    };
  }

  async deleteProject(id: string, taiKhoan: string) {
    const project = await this.DTRes.findOne({
      where: { MaDT: id },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }
    await this.ensureProjectCanBeEdited(project, taiKhoan);

    // ThanhVienDT không cấu hình cascade ở khóa ngoại, nên phải xóa trước DeTai.
    // Tài liệu cũng được xóa để tránh lỗi khóa ngoại trên các cơ sở dữ liệu cũ.
    await this.documentRes.delete({ MaDT: id });
    await this.TVDTRes.delete({ MaDT: id });
    return this.DTRes.delete({ MaDT: id });
  }

  async updateProject(id: string, dto: UpdateProjectDto, taiKhoan: string) {
    const project = await this.DTRes.findOne({ where: { MaDT: id } });
    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }
    await this.ensureProjectCanBeEdited(project, taiKhoan, true);

    if (dto.TenDT !== undefined) project.TenDT = dto.TenDT.trim();
    if (dto.ChuyenNganh !== undefined) project.ChuyenNganh = dto.ChuyenNganh;
    if (dto.Khoa !== undefined) project.Khoa = dto.Khoa;
    if (dto.PhanLoai !== undefined) project.PhanLoai = dto.PhanLoai;
    if (dto.idNguoiHD !== undefined) project.idNguoiHD = dto.idNguoiHD;
    if (dto.MoTa !== undefined) project.MoTa = dto.MoTa;

    return this.DTRes.save(project);
  }

  async getMemberById(id: string) {
    const mem = await this.TVDTRes.find({
      where: { MaDT: id.trim() },
      relations: ['NguoiDung'],
      select: {
        NguoiDung: {
          TenDayDu: true,
          VaiTro: true,
        },
      },
    });
    return mem;
  }

  async getLeaderById(id: string) {
    const role = 'Nhóm trưởng';
    const leader = await this.TVDTRes.findOne({
      where: { MaDT: id.trim(), VaiTroDT: role.trim() },
    });
    return leader;
  }

  async updateProjectDate(id: string, dto: DateDto, taiKhoan: string) {
    const project = await this.DTRes.findOne({ where: { MaDT: id } });

    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }
    await this.ensureProjectManager(id, taiKhoan);

    // Chỉ cập nhật field nào được truyền vào
    if (dto.NgayBatDau) project.NgayBatDau = new Date(dto.NgayBatDau);
    if (dto.NgayKetThuc) project.NgayKetThuc = new Date(dto.NgayKetThuc);
    if (dto.NgayXetDuyet) project.NgayXetDuyet = new Date(dto.NgayXetDuyet);

    return this.DTRes.save(project);
  }

  async updateTienDoProject(id: string, TD: number) {
    const project = await this.DTRes.findOne({ where: { MaDT: id } });

    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }

    project.TienDo = Math.min(TD, 100);
    if (project.TienDo === 100) {
      project.TrangThai = 'Chờ nghiệm thu';
    }
    return this.DTRes.save(project);
  }
}
