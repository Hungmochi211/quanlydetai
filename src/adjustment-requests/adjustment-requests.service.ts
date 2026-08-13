import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AdjustmentRequestQueryDto,
  ApplyAdjustmentRequestDto,
  AdminReviewAdjustmentRequestDto,
  CreateAdjustmentRequestDto,
} from 'src/dto/AdjustmentRequestDto';
import { YeuCauDieuChinhDeTai } from 'src/entity/adjustment-request.entity';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

const ADJUSTABLE_PROJECT_STATUSES = ['Đã phê duyệt', 'Bắt đầu', 'Đang thực hiện'];

@Injectable()
export class AdjustmentRequestsService {
  constructor(
    @InjectRepository(YeuCauDieuChinhDeTai)
    private readonly requestRepository: Repository<YeuCauDieuChinhDeTai>,
    @InjectRepository(DeTai)
    private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(ThanhVienDT)
    private readonly memberRepository: Repository<ThanhVienDT>,
    @InjectRepository(MocDeTai)
    private readonly milestoneRepository: Repository<MocDeTai>,
    @InjectRepository(TaiLieu)
    private readonly documentRepository: Repository<TaiLieu>,
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(maDT: string, dto: CreateAdjustmentRequestDto, taiKhoan: string) {
    const project = await this.getProjectOrThrow(maDT);
    await this.ensureLeader(maDT, taiKhoan);
    this.ensureAdjustableProject(project);

    const pendingRequest = await this.requestRepository.findOne({
      where: { MaDT: maDT, TaiKhoanNguoiGui: taiKhoan, TrangThai: 'Chờ duyệt' },
    });
    if (pendingRequest) {
      throw new BadRequestException('Đề tài đã có phiếu điều chỉnh đang chờ Admin duyệt');
    }

    const request = await this.requestRepository.save(this.requestRepository.create({
      MaDT: maDT,
      TaiKhoanNguoiGui: taiKhoan,
      NhomDieuChinh: dto.NhomDieuChinh.map((item) => item.trim()).join(' | '),
      ThongTinHienTai: dto.ThongTinHienTai.trim(),
      NoiDungDeNghi: dto.NoiDungDeNghi.trim(),
      LyDo: dto.LyDo.trim(),
      TrangThai: 'Chờ duyệt',
    }));

    await this.notifyAdmins(
      taiKhoan,
      'Có phiếu điều chỉnh đề tài mới',
      `Đề tài ${project.TenDT} (${maDT}) có phiếu điều chỉnh đang chờ xử lý.`,
    );
    return this.findOne(request.Id, taiKhoan, false);
  }

  async resubmit(id: number, dto: CreateAdjustmentRequestDto, taiKhoan: string) {
    const rejectedRequest = await this.getRequestOrThrow(id);
    if (rejectedRequest.TaiKhoanNguoiGui !== taiKhoan) {
      throw new ForbiddenException('Chỉ người tạo phiếu mới được gửi lại');
    }
    if (rejectedRequest.TrangThai !== 'Từ chối') {
      throw new BadRequestException('Chỉ được gửi lại phiếu đã bị từ chối');
    }
    return this.createResubmission(rejectedRequest, dto, taiKhoan);
  }

  async findMine(taiKhoan: string) {
    return this.requestRepository.find({
      where: { TaiKhoanNguoiGui: taiKhoan },
      relations: ['DeTai', 'NguoiXuLy', 'TaiLieu'],
      order: { NgayGui: 'DESC' },
    });
  }

  async findAllForAdmin(taiKhoan: string, query: AdjustmentRequestQueryDto) {
    await this.ensureAdmin(taiKhoan);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.requestRepository.createQueryBuilder('request')
      .leftJoinAndSelect('request.DeTai', 'project')
      .leftJoinAndSelect('request.NguoiGui', 'sender')
      .leftJoinAndSelect('request.NguoiXuLy', 'processor')
      .leftJoinAndSelect('request.TaiLieu', 'document')
      .orderBy('request.NgayGui', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) builder.where('request.TrangThai = :status', { status: query.status });
    const [data, total] = await builder.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number, taiKhoan: string, requireAdmin = false) {
    const request = await this.getRequestOrThrow(id);
    const isAdmin = await this.isAdmin(taiKhoan);
    if (requireAdmin && !isAdmin) throw new ForbiddenException('Chỉ Admin được xem phiếu này');
    if (!isAdmin && request.TaiKhoanNguoiGui !== taiKhoan) {
      throw new ForbiddenException('Bạn không có quyền xem phiếu điều chỉnh này');
    }
    return request;
  }

  async review(id: number, dto: AdminReviewAdjustmentRequestDto, taiKhoan: string) {
    await this.ensureAdmin(taiKhoan);
    const request = await this.getRequestOrThrow(id);
    if (request.TrangThai !== 'Chờ duyệt') {
      throw new BadRequestException('Phiếu điều chỉnh này đã được xử lý');
    }
    if (dto.decision === 'rejected' && !dto.reason?.trim()) {
      throw new BadRequestException('Nhập lý do từ chối phiếu điều chỉnh');
    }

    const accepted = dto.decision === 'accepted';
    await this.requestRepository.update(request.Id, {
      TrangThai: accepted ? 'Đã chấp nhận' : 'Từ chối',
      TaiKhoanNguoiXuLy: taiKhoan,
      LyDoTuChoi: accepted ? null as any : dto.reason?.trim(),
      NgayXuLy: new Date(),
    });

    await this.notificationsService.create(
      { TaiKhoan: taiKhoan },
      {
        TkNguoiNhan: request.TaiKhoanNguoiGui,
        TieuDe: accepted ? 'Phiếu điều chỉnh đã được chấp nhận' : 'Phiếu điều chỉnh bị từ chối',
        NoiDung: accepted
          ? `Phiếu điều chỉnh của đề tài ${request.MaDT} đã được Admin chấp nhận.`
          : `Phiếu điều chỉnh của đề tài ${request.MaDT} bị từ chối: ${dto.reason?.trim()}`,
        NgayTao: new Date(),
      },
    );
    return this.findOne(id, taiKhoan, true);
  }

  async apply(id: number, dto: ApplyAdjustmentRequestDto, taiKhoan: string) {
    await this.ensureAdmin(taiKhoan);
    const request = await this.getRequestOrThrow(id);
    if (request.TrangThai !== 'Đã chấp nhận') {
      throw new BadRequestException('Chỉ áp dụng phiếu đã được chấp nhận');
    }
    if (request.DaApDung) {
      throw new BadRequestException('Phiếu điều chỉnh này đã được áp dụng');
    }

    const project = await this.getProjectOrThrow(request.MaDT);
    const applied: string[] = [];

    const projectChanges = dto.ThongTinDeTai || (dto.MoTa !== undefined ? { MoTa: dto.MoTa } : undefined);
    if (projectChanges) {
      if (!request.NhomDieuChinh.includes('Nội dung nghiên cứu')) {
        throw new BadRequestException('Phiếu không yêu cầu điều chỉnh nội dung nghiên cứu');
      }
      const allowedFields = ['TenDT', 'ChuyenNganh', 'Khoa', 'PhanLoai', 'MoTa'] as const;
      for (const field of allowedFields) {
        const value = projectChanges[field];
        if (value !== undefined) project[field] = value.trim() as never;
      }
      await this.projectRepository.save(project);
      applied.push('nội dung nghiên cứu');
    }

    if (dto.Milestones?.length) {
      if (!request.NhomDieuChinh.includes('Tiến độ / mốc thực hiện')) {
        throw new BadRequestException('Phiếu không yêu cầu điều chỉnh tiến độ');
      }
      for (const item of dto.Milestones) {
        const milestone = await this.milestoneRepository.findOne({
          where: { MaMoc: item.MaMoc, MaDT: request.MaDT },
        });
        if (!milestone) {
          throw new NotFoundException(`Không tìm thấy mốc ${item.MaMoc} của đề tài`);
        }
        milestone.NgayKetThuc = new Date(item.NgayKetThuc);
        await this.milestoneRepository.save(milestone);
      }
      applied.push('tiến độ/mốc thực hiện');
    }

    if (dto.ThanhVien?.length) {
      if (!request.NhomDieuChinh.includes('Thành viên thực hiện')) {
        throw new BadRequestException('Phiếu không yêu cầu điều chỉnh thành viên');
      }
      const accounts = dto.ThanhVien.map((item) => item.TaiKhoan.trim());
      if (new Set(accounts).size !== accounts.length) {
        throw new BadRequestException('Danh sách thành viên bị trùng tài khoản');
      }
      const users = await this.userRepository.findBy({ TaiKhoan: In(accounts) });
      if (users.length !== accounts.length) {
        throw new BadRequestException('Có tài khoản thành viên không tồn tại');
      }
      const hasLeader = dto.ThanhVien.some((item) => {
        const role = this.normalize(item.VaiTroDT);
        return role.includes('truong nhom') || role.includes('nhom truong');
      });
      if (!hasLeader) {
        throw new BadRequestException('Danh sách thành viên phải có một nhóm trưởng');
      }
      await this.memberRepository.delete({ MaDT: request.MaDT });
      await this.memberRepository.save(dto.ThanhVien.map((item) => this.memberRepository.create({
        MaDT: request.MaDT,
        TaiKhoan: item.TaiKhoan.trim(),
        VaiTroDT: item.VaiTroDT.trim(),
      })));
      applied.push('thành viên thực hiện');
    }

    if (!applied.length) {
      throw new BadRequestException('Nhập ít nhất một thay đổi để áp dụng');
    }

    await this.requestRepository.update(id, {
      DaApDung: true,
      NgayApDung: new Date(),
      NoiDungDaApDung: dto.GhiChuApDung?.trim() || `Admin đã áp dụng: ${applied.join(', ')}.`,
    });
    await this.notificationsService.create(
      { TaiKhoan: taiKhoan },
      {
        TkNguoiNhan: request.TaiKhoanNguoiGui,
        TieuDe: 'Điều chỉnh đề tài đã được áp dụng',
        NoiDung: `Admin đã áp dụng điều chỉnh cho đề tài ${request.MaDT}: ${applied.join(', ')}.`,
        NgayTao: new Date(),
      },
    );
    return this.findOne(id, taiKhoan, true);
  }

  async remove(id: number, taiKhoan: string) {
    await this.ensureAdmin(taiKhoan);
    await this.getRequestOrThrow(id);
    // Khóa ngoại TaiLieu dùng NO ACTION, cần xóa bản ghi đính kèm trước.
    await this.documentRepository.delete({ MaYeuCauDieuChinh: id });
    await this.requestRepository.delete(id);
    return { message: 'Đã xóa phiếu điều chỉnh' };
  }

  private async createResubmission(
    rejectedRequest: YeuCauDieuChinhDeTai,
    dto: CreateAdjustmentRequestDto,
    taiKhoan: string,
  ) {
    const project = await this.getProjectOrThrow(rejectedRequest.MaDT);
    await this.ensureLeader(project.MaDT, taiKhoan);
    this.ensureAdjustableProject(project);
    const request = await this.requestRepository.save(this.requestRepository.create({
      MaDT: project.MaDT,
      TaiKhoanNguoiGui: taiKhoan,
      YeuCauGocId: rejectedRequest.Id,
      NhomDieuChinh: dto.NhomDieuChinh.map((item) => item.trim()).join(' | '),
      ThongTinHienTai: dto.ThongTinHienTai.trim(),
      NoiDungDeNghi: dto.NoiDungDeNghi.trim(),
      LyDo: dto.LyDo.trim(),
      TrangThai: 'Chờ duyệt',
    }));
    await this.notifyAdmins(taiKhoan, 'Có phiếu điều chỉnh gửi lại', `Đề tài ${project.TenDT} (${project.MaDT}) vừa gửi lại phiếu điều chỉnh.`);
    return this.findOne(request.Id, taiKhoan, false);
  }

  private async getRequestOrThrow(id: number) {
    const request = await this.requestRepository.findOne({
      where: { Id: id },
      relations: ['DeTai', 'NguoiGui', 'NguoiXuLy', 'TaiLieu'],
    });
    if (!request) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    return request;
  }

  private async getProjectOrThrow(maDT: string) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài');
    return project;
  }

  private async ensureLeader(maDT: string, taiKhoan: string) {
    const member = await this.memberRepository.findOne({ where: { MaDT: maDT, TaiKhoan: taiKhoan } });
    if (!member || !this.normalize(member.VaiTroDT).includes('truong nhom') && !this.normalize(member.VaiTroDT).includes('nhom truong')) {
      throw new ForbiddenException('Chỉ nhóm trưởng được tạo phiếu điều chỉnh');
    }
  }

  private ensureAdjustableProject(project: DeTai) {
    if (!ADJUSTABLE_PROJECT_STATUSES.includes(project.TrangThai)) {
      throw new BadRequestException('Chỉ đề tài đang triển khai mới được tạo phiếu điều chỉnh');
    }
  }

  private async ensureAdmin(taiKhoan: string) {
    if (!await this.isAdmin(taiKhoan)) throw new ForbiddenException('Chỉ Admin được thực hiện thao tác này');
  }

  private async isAdmin(taiKhoan: string) {
    const user = await this.userRepository.findOne({ where: { TaiKhoan: taiKhoan } });
    return this.normalize(user?.VaiTro || '') === 'admin';
  }

  private async notifyAdmins(sender: string, title: string, content: string) {
    const admins = await this.userRepository.find({ where: { VaiTro: In(['Admin', 'admin']) } });
    await Promise.all(admins.map((admin) => this.notificationsService.create(
      { TaiKhoan: sender },
      { TkNguoiNhan: admin.TaiKhoan, TieuDe: title, NoiDung: content, NgayTao: new Date() },
    )));
  }

  private normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').trim();
  }
}
