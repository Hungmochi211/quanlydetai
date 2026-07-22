import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectCommentDto, UpdateProjectCommentDto } from 'src/dto/ProjectCommentDto';
import { NhanXetDeTai } from 'src/entity/project-comment.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(NhanXetDeTai)
    private readonly commentRepository: Repository<NhanXetDeTai>,
    @InjectRepository(DeTai)
    private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
  ) {}

  async findByProject(maDT: string) {
    return this.commentRepository.find({
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
  }

  async create(maDT: string, dto: CreateProjectCommentDto, taiKhoan: string) {
    await this.ensureProjectExists(maDT);
    await this.ensureCanComment(taiKhoan);
    const noiDung = dto.NoiDung?.trim();
    if (!noiDung) throw new BadRequestException('Nội dung nhận xét không được để trống');

    const comment = this.commentRepository.create({ MaDT: maDT, TaiKhoan: taiKhoan, NoiDung: noiDung });
    await this.commentRepository.save(comment);
    return this.findOneWithUser(comment.Id);
  }

  async update(id: number, dto: UpdateProjectCommentDto, taiKhoan: string) {
    const comment = await this.findOneOrThrow(id);
    if (comment.TaiKhoan !== taiKhoan) throw new ForbiddenException('Bạn chỉ được sửa nhận xét của chính mình');
    await this.ensureCanComment(taiKhoan);
    const noiDung = dto.NoiDung?.trim();
    if (!noiDung) throw new BadRequestException('Nội dung nhận xét không được để trống');

    comment.NoiDung = noiDung;
    await this.commentRepository.save(comment);
    return this.findOneWithUser(id);
  }

  async remove(id: number, taiKhoan: string) {
    const comment = await this.findOneOrThrow(id);
    if (comment.TaiKhoan !== taiKhoan) throw new ForbiddenException('Bạn chỉ được xóa nhận xét của chính mình');
    await this.ensureCanComment(taiKhoan);
    await this.commentRepository.remove(comment);
    return { message: 'Đã xóa nhận xét' };
  }

  private async findOneOrThrow(id: number) {
    const comment = await this.commentRepository.findOne({ where: { Id: id } });
    if (!comment) throw new NotFoundException('Không tìm thấy nhận xét');
    return comment;
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

  private async ensureCanComment(taiKhoan: string) {
    const user = await this.userRepository.findOne({ where: { TaiKhoan: taiKhoan } });
    if (!user || !this.isCommitteeOrAdvisor(user.VaiTro)) {
      throw new ForbiddenException('Chỉ Hội đồng hoặc Người hướng dẫn được thêm nhận xét');
    }
  }

  private isCommitteeOrAdvisor(role?: string) {
    const normalized = (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim();
    return normalized.includes('hoi dong') || normalized.includes('nguoi huong dan');
  }
}
