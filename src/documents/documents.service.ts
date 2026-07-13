import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { TaiLieu } from 'src/entity/document.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(TaiLieu)
        private TLRes: Repository<TaiLieu>,
    ) { }

    async upload(dto: AddTaiLieuDto, file: Express.Multer.File): Promise<TaiLieu> {
        const taiLieu = this.TLRes.create({
            MaDT: dto.MaDT,
            MaMoc: dto.MaMoc,
            NguoiGui: dto.NguoiGui,
            LoaiTaiLieu: dto.LoaiTaiLieu,
            TenFile: file.originalname,
            FilePath: `/uploads/documents/${file.filename}`,
        });

        return this.TLRes.save(taiLieu);
    }

    async findOne(id: number): Promise<TaiLieu> {
        const taiLieu = await this.TLRes.findOne({ where: { MaTL: id } });
        if (!taiLieu) {
            throw new NotFoundException(`Không tìm thấy tài liệu với id = ${id}`);
        }
        return taiLieu;
    }

    async getPhysicalPath(id: number): Promise<{ path: string, tenFile: string }> {
        const fileIsFound = await this.findOne(id);
        const physicalPath = join(process.cwd(), fileIsFound.FilePath);

        if (!existsSync(physicalPath)) {
            throw new NotFoundException('File không tồn tại trên server');
        }

        return { path: physicalPath, tenFile: fileIsFound.TenFile };
    }

    async findByDeTai(maDT: string): Promise<TaiLieu[]> {
        return this.TLRes.find({
            where: { MaDT: maDT },
            order: { NgayTaiLen: 'DESC' },
        });
    }

    async findByMoc(maMoc: number): Promise<TaiLieu[]> {
        return this.TLRes.find({
            where: { MaMoc: maMoc },
            order: { NgayTaiLen: 'DESC' },
        });
    }

    async remove(id: number): Promise<void> {
        const taiLieu = await this.findOne(id);
        const physicalPath = join(process.cwd(), taiLieu.FilePath);

        if (existsSync(physicalPath)) {
            unlinkSync(physicalPath);
        }

        await this.TLRes.remove(taiLieu);
    }


}
