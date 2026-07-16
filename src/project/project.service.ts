import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateDto } from 'src/dto/DateDto';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { In, Repository } from 'typeorm';
import { ReviewProjectDto, SubmitProjectForApprovalDto } from 'src/dto/ProjectApprovalDto';

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
    const member = await this.TVDTRes.findOne({ where: { MaDT: maDT, TaiKhoan: taiKhoan } });
    if (member && this.normalizeRole(member.VaiTroDT).includes('nhom truong')) {
      return;
    }

    const approval = await this.approvalRes.findOne({
      where: { MaDT: maDT, TaiKhoanHoiDong: taiKhoan, TrangThai: 'Đã phê duyệt' },
    });
    if (!approval) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đề tài này');
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
      TrangThai: 'Chờ phê duyệt',
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

    const reviewerIds = [...new Set((dto.reviewerIds || []).map((id) => id.trim()).filter(Boolean))];
    if (reviewerIds.length === 0) {
      throw new BadRequestException('Phải chọn ít nhất một thành viên hội đồng');
    }

    const reviewers = await this.userRes.find({ where: { TaiKhoan: In(reviewerIds) } });
    const committeeIds = reviewers
      .filter((reviewer) => this.normalizeRole(reviewer.VaiTro).includes('hoi dong'))
      .map((reviewer) => reviewer.TaiKhoan);

    if (committeeIds.length !== reviewerIds.length) {
      throw new BadRequestException('Danh sách người nhận phải là thành viên hội đồng hợp lệ');
    }

    // Gửi lại yêu cầu sẽ thay toàn bộ danh sách xét duyệt cũ bằng danh sách mới.
    await this.approvalRes.delete({ MaDT: maDT });
    await this.approvalRes.save(
      committeeIds.map((TaiKhoanHoiDong) =>
        this.approvalRes.create({
          MaDT: maDT,
          TaiKhoanHoiDong,
          TrangThai: 'Chờ phê duyệt',
          GhiChu: dto.note?.trim() || undefined,
        }),
      ),
    );

    project.TrangThai = 'Chờ phê duyệt';
    project.NgayXetDuyet = null;
    await this.DTRes.save(project);

    return this.getApprovalSummary(maDT);
  }

  async reviewProject(maDT: string, reviewerAccount: string, dto: ReviewProjectDto) {
    if (dto.decision !== 'approved' && dto.decision !== 'rejected') {
      throw new BadRequestException('Quyết định xét duyệt không hợp lệ');
    }

    const approval = await this.approvalRes.findOne({
      where: { MaDT: maDT, TaiKhoanHoiDong: reviewerAccount },
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

    const approvals = await this.approvalRes.find({ where: { MaDT: maDT } });
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
    return this.approvalRes.find({
      where: { MaDT: maDT },
      order: { NgayTao: 'ASC', Id: 'ASC' },
    });
  }

  private async getApprovalSummary(maDT: string) {
    const approvals = await this.getApprovals(maDT);
    const project = await this.DTRes.findOne({ where: { MaDT: maDT } });
    const approvedReviewers = approvals.filter((item) => item.TrangThai === 'Đã phê duyệt').length;
    return {
      projectStatus: project?.TrangThai,
      totalReviewers: approvals.length,
      approvedReviewers,
      pendingReviewers: approvals.filter((item) => item.TrangThai === 'Chờ phê duyệt').length,
      allApproved: approvals.length > 0 && approvedReviewers === approvals.length,
    };
  }

  async deleteProject(id: string, taiKhoan: string) {
    const project = await this.DTRes.findOne({
      where: { MaDT: id },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy đề tài này');
    }
    await this.ensureProjectLeader(id, taiKhoan);
    return this.DTRes.delete(project);
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
