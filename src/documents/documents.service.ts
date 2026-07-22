import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, promises as fs } from 'fs';
import { basename, join } from 'path';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(TaiLieu)
    private readonly taiLieuRepository: Repository<TaiLieu>,
    @InjectRepository(ThanhVienDT)
    private readonly thanhVienRepository: Repository<ThanhVienDT>,
    @InjectRepository(MocDeTai)
    private readonly mocRepository: Repository<MocDeTai>,

    @InjectRepository(XetDuyetDeTai)
    private readonly approvalRepository: Repository<XetDuyetDeTai>,
  ) { }

  async upload(
    dto: AddTaiLieuDto,
    file: Express.Multer.File,
    taiKhoan: string,
  ): Promise<TaiLieu> {
    const maDT = dto.MaDT?.trim();
    if (!maDT) {
      throw new BadRequestException('Mã đề tài là bắt buộc');
    }

    await this.getMemberOrThrow(maDT, taiKhoan);

    const maMoc = await this.validateMilestone(dto.MaMoc, maDT);

    // Nếu mốc đã có tài liệu thì thay thế
    if (maMoc) {
      const oldDocument = await this.taiLieuRepository.findOne({
        where: { MaMoc: maMoc },
      });

      if (oldDocument) {
        await this.taiLieuRepository.remove(oldDocument);

        await fs
          .unlink(this.getPhysicalPathForDocument(oldDocument))
          .catch(() => undefined);
      }
    }

    const taiLieu = this.taiLieuRepository.create({
      MaDT: maDT,
      MaMoc: maMoc,
      NguoiGui: taiKhoan,
      LoaiTaiLieu: dto.LoaiTaiLieu?.trim(),
      TenFile: file.originalname,
      FilePath: file.filename,
    });

    try {
      return await this.taiLieuRepository.save(taiLieu);
    } catch (error) {
      await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async findOne(id: number, taiKhoan: string): Promise<TaiLieu> {
    const taiLieu = await this.findOneById(id);
    await this.ensureCanViewProject(taiLieu.MaDT, taiKhoan);
    return taiLieu;
  }

  async getPhysicalPath(
    id: number,
    taiKhoan: string,
  ): Promise<{ path: string; tenFile: string }> {
    const taiLieu = await this.findOne(id, taiKhoan);
    const physicalPath = this.getPhysicalPathForDocument(taiLieu);

    if (!existsSync(physicalPath)) {
      throw new NotFoundException('File không tồn tại trên server');
    }

    return { path: physicalPath, tenFile: taiLieu.TenFile };
  }

  async findByDeTai(maDT: string, taiKhoan: string): Promise<TaiLieu[]> {
    await this.ensureCanViewProject(maDT, taiKhoan);
    return this.taiLieuRepository.find({
      where: { MaDT: maDT },
      order: { NgayTaiLen: 'DESC' },
    });
  }

  async findByMoc(maMoc: number, taiKhoan: string): Promise<TaiLieu[]> {
    const moc = await this.mocRepository.findOne({ where: { MaMoc: maMoc } });
    if (!moc) {
      throw new NotFoundException(`Không tìm thấy mốc với id = ${maMoc}`);
    }

    await this.ensureCanViewProject(moc.MaDT, taiKhoan);
    return this.taiLieuRepository.find({
      where: { MaMoc: maMoc },
      order: { NgayTaiLen: 'DESC' },
    });
  }

  async remove(id: number, taiKhoan: string): Promise<void> {
    const taiLieu = await this.findOneById(id);

    // Chỉ kiểm tra người này có thuộc đề tài hay không
    await this.getMemberOrThrow(taiLieu.MaDT, taiKhoan);

    await this.taiLieuRepository.remove(taiLieu);

    await fs.unlink(this.getPhysicalPathForDocument(taiLieu)).catch(() => undefined);
  }

  private async findOneById(id: number): Promise<TaiLieu> {
    const taiLieu = await this.taiLieuRepository.findOne({
      where: { MaTL: id },
    });
    if (!taiLieu) {
      throw new NotFoundException(`Không tìm thấy tài liệu với id = ${id}`);
    }
    return taiLieu;
  }

  private async getMemberOrThrow(
    maDT: string,
    taiKhoan: string,
  ): Promise<ThanhVienDT> {
    const thanhVien = await this.thanhVienRepository.findOne({
      where: { MaDT: maDT, TaiKhoan: taiKhoan },
    });
    if (!thanhVien) {
      throw new ForbiddenException('Bạn không thuộc đề tài này');
    }
    return thanhVien;
  }

  private async ensureCanViewProject(maDT: string, taiKhoan: string): Promise<void> {
    const thanhVien = await this.thanhVienRepository.findOne({
      where: { MaDT: maDT, TaiKhoan: taiKhoan },
    });
    if (thanhVien) return;

    const approval = await this.approvalRepository.findOne({
      where: { MaDT: maDT, TaiKhoanHoiDong: taiKhoan },
    });
    if (!approval) {
      throw new ForbiddenException('Bạn không có quyền xem tài liệu của đề tài này');
    }
  }

  private async validateMilestone(
    rawMaMoc: number | string | undefined,
    maDT: string,
  ): Promise<number | undefined> {
    if (rawMaMoc === undefined || rawMaMoc === null || rawMaMoc === '') {
      return undefined;
    }

    const maMoc = Number(rawMaMoc);
    if (!Number.isInteger(maMoc)) {
      throw new BadRequestException('Mã mốc không hợp lệ');
    }

    const moc = await this.mocRepository.findOne({ where: { MaMoc: maMoc } });
    if (!moc || moc.MaDT !== maDT) {
      throw new BadRequestException('Mốc tiến độ không thuộc đề tài này');
    }
    return maMoc;
  }

  async removeByMilestone(maMoc: number): Promise<void> {
    const documents = await this.taiLieuRepository.find({
      where: { MaMoc: maMoc },
    });

    for (const document of documents) {
      await fs
        .unlink(this.getPhysicalPathForDocument(document))
        .catch(() => undefined);

      await this.taiLieuRepository.remove(document);
    }
  }

  private getPhysicalPathForDocument(taiLieu: TaiLieu): string {
    const fileName = basename(taiLieu.FilePath);
    const isLegacyPublicFile = taiLieu.FilePath.includes('uploads/documents');
    const directory = isLegacyPublicFile
      ? join('uploads', 'documents')
      : join('private-uploads', 'documents');
    return join(process.cwd(), directory, fileName);
  }

  private normalizeRole(role: string): string {
    return role
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
