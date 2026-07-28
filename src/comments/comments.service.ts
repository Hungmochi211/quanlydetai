import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectCommentDto, UpdateProjectCommentDto } from 'src/dto/ProjectCommentDto';
import { NhanXetDeTai } from 'src/entity/project-comment.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(NhanXetDeTai)
    private readonly commentRepository: Repository<NhanXetDeTai>,
    @InjectRepository(DeTai)
    private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
    @InjectRepository(HoiDongDeTai)
    private readonly councilAssignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(ThanhVienHoiDong)
    private readonly councilMemberRepository: Repository<ThanhVienHoiDong>,
  ) {}

  async findByProject(maDT: string) {
    const comments = await this.commentRepository.find({
      where: { MaDT: maDT },
      relations: { NguoiDung: true },
      select: {
        Id: true,
        MaDT: true,
        TaiKhoan: true,
        NoiDung: true,
        NgayTao: true,
        NgayCapNhat: true,
        NguoiDung: { TaiKhoan: true, TenDayDu: true, VaiTro: true },
      },
      order: { NgayTao: 'DESC' },
    });
    return this.attachCouncilInfo(comments, maDT);
  }

  async create(maDT: string, dto: CreateProjectCommentDto, taiKhoan: string) {
    await this.ensureProjectExists(maDT);
    await this.ensureCanComment(maDT, taiKhoan);
    const noiDung = dto.NoiDung?.trim();
    if (!noiDung) throw new BadRequestException('Nội dung nhận xét không được để trống');

    const comment = this.commentRepository.create({ MaDT: maDT, TaiKhoan: taiKhoan, NoiDung: noiDung });
    await this.commentRepository.save(comment);
    return this.findOneWithUser(comment.Id);
  }

  async update(id: number, dto: UpdateProjectCommentDto, taiKhoan: string) {
    const comment = await this.findOneOrThrow(id);
    if (comment.TaiKhoan !== taiKhoan) throw new ForbiddenException('Bạn chỉ được sửa nhận xét của chính mình');
    await this.ensureCanComment(comment.MaDT, taiKhoan);
    const noiDung = dto.NoiDung?.trim();
    if (!noiDung) throw new BadRequestException('Nội dung nhận xét không được để trống');

    comment.NoiDung = noiDung;
    await this.commentRepository.save(comment);
    return this.findOneWithUser(id);
  }

  async remove(id: number, taiKhoan: string) {
    const comment = await this.findOneOrThrow(id);
    if (comment.TaiKhoan !== taiKhoan) throw new ForbiddenException('Bạn chỉ được xóa nhận xét của chính mình');
    await this.ensureCanComment(comment.MaDT, taiKhoan);
    await this.commentRepository.remove(comment);
    return { message: 'Đã xóa nhận xét' };
  }

  private async findOneOrThrow(id: number) {
    const comment = await this.commentRepository.findOne({ where: { Id: id } });
    if (!comment) throw new NotFoundException('Không tìm thấy nhận xét');
    return (await this.attachCouncilInfo([comment], comment.MaDT))[0];
  }

  private async attachCouncilInfo(comments: NhanXetDeTai[], maDT: string) {
    const assignments = await this.councilAssignmentRepository.find({
      where: { MaDT: maDT },
      relations: ['HoiDong', 'HoiDong.ThanhVienHoiDong'],
    });
    return comments.map((comment) => ({
      ...comment,
      HoiDongs: assignments
        .filter((assignment) => assignment.HoiDong?.ThanhVienHoiDong.some((member) => member.TaiKhoan === comment.TaiKhoan))
        .map((assignment) => assignment.HoiDong.TenHoiDong),
    }));
  }

  private async findOneWithUser(id: number) {
    const comment = await this.commentRepository.findOne({
      where: { Id: id },
      relations: { NguoiDung: true },
      select: {
        Id: true,
        MaDT: true,
        TaiKhoan: true,
        NoiDung: true,
        NgayTao: true,
        NgayCapNhat: true,
        NguoiDung: { TaiKhoan: true, TenDayDu: true, VaiTro: true },
      },
    });
    if (!comment) throw new NotFoundException('Không tìm thấy nhận xét');
    return comment;
  }

  private async ensureProjectExists(maDT: string) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài');
  }

  private async ensureCanComment(maDT: string, taiKhoan: string) {
    const user = await this.userRepository.findOne({ where: { TaiKhoan: taiKhoan } });
    if (!user) throw new ForbiddenException('Không xác định được tài khoản nhận xét');
    if (this.isAdvisor(user.VaiTro)) return;

    const assignments = await this.councilAssignmentRepository.find({ where: { MaDT: maDT } });
    const councilIds = assignments.map((assignment) => assignment.MaHoiDong);
    if (councilIds.length === 0) {
      throw new ForbiddenException('Đề tài chưa được gán hội đồng để nhận xét');
    }
    const member = await this.councilMemberRepository.findOne({
      where: { TaiKhoan: taiKhoan, MaHoiDong: In(councilIds) },
    });
    if (!member) throw new ForbiddenException('Bạn không thuộc hội đồng được gán cho đề tài này');
  }

  private isAdvisor(role?: string) {
    const normalized = (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim();
    return normalized.includes('nguoi huong dan');
  }
}
