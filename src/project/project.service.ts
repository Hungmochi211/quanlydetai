import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateDto } from 'src/dto/DateDto';
import { UpdateProjectDto } from 'src/dto/UpdateProjectDto';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { In, Repository } from 'typeorm';
import { ReviewProjectDto, SubmitProjectForApprovalDto } from 'src/dto/ProjectApprovalDto';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(DeTai)
    private DTRes: Repository<DeTai>,

    @InjectRepository(ThanhVienDT)
    private TVDTRes: Repository<ThanhVienDT>,

    @InjectRepository(XetDuyetDeTai)
    private approvalRes: Repository<XetDuyetDeTai>,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,

    @InjectRepository(TaiLieu)
    private documentRes: Repository<TaiLieu>,

    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeRole(role?: string) {
    return (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim();
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

  private async ensureProjectCanBeEdited(project: DeTai, taiKhoan: string) {
    await this.ensureProjectLeader(project.MaDT, taiKhoan);

    if (project.TrangThai !== 'Nháp') {
      throw new BadRequestException('Chỉ được sửa hoặc xóa đề tài ở trạng thái Nháp');
    }

    const submittedForApproval = await this.approvalRes.count({
      where: { MaDT: project.MaDT, LoaiHoiDong: 'Xét duyệt' },
    });
    if (submittedForApproval > 0) {
      throw new BadRequestException('Đề tài đã gửi Hội đồng xét duyệt nên không thể sửa hoặc xóa');
    }
  }

  async registerProject(user: any, prDto: RegisterTopicDto) {
    //kiem tra de tai
    const detai = await this.DTRes.findOne({ where: { MaDT: prDto.MaDT } });

    if (detai) {
      throw new NotFoundException('Đề tài này đã tồn tại!');
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
      idNguoiHD: prDto.idNguoiHD,
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
    for (const member of prDto.ThanhVienIds) {
      if (member === user.TaiKhoan) continue;
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

    if (isScoringCouncil && project.TrangThai !== 'Đã phê duyệt') {
      throw new BadRequestException('Chỉ được gửi Hội đồng chấm điểm sau khi đề tài đã được phê duyệt');
    }

    const existingApprovals = await this.approvalRes.count({
      where: { MaDT: maDT, LoaiHoiDong: councilType },
    });
    if (existingApprovals > 0) {
      throw new BadRequestException(`Đề tài đã được gửi ${councilRole} và không thể gửi lại`);
    }

    const committeeUsers = (await this.userRes.find())
      .filter((reviewer) => {
        const role = this.normalizeRole(reviewer.VaiTro);
        return isScoringCouncil
          ? role.includes('hoi dong cham diem')
          : role === 'hoi dong' || role.includes('hoi dong xet duyet');
      });
    if (committeeUsers.length === 0) {
      throw new BadRequestException(`Chưa có tài khoản nào có vai trò ${councilRole}`);
    }

    await this.approvalRes.save(
      committeeUsers.map(({ TaiKhoan }) =>
        this.approvalRes.create({
          MaDT: maDT,
          TaiKhoanHoiDong: TaiKhoan,
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
      committeeUsers.map(({ TaiKhoan }) =>
        this.notificationsService.create(
          { TaiKhoan: sender },
          {
            TkNguoiNhan: TaiKhoan,
            TieuDe: isScoringCouncil ? 'Có đề tài chờ chấm điểm' : 'Có đề tài chờ xét duyệt',
            NoiDung: `Đề tài "${project.TenDT}" đang chờ bạn ${isScoringCouncil ? 'chấm điểm' : 'xét duyệt'}.${dto.note ? ` Ghi chú: ${dto.note}` : ''}`,
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
    await this.ensureProjectCanBeEdited(project, taiKhoan);

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

    project.TienDo = TD;
    return this.DTRes.save(project);
  }
}
