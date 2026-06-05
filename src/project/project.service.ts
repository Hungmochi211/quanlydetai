import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateDto } from 'src/dto/DateDto';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectService {
    constructor(
        @InjectRepository(DeTai)
        private DTRes: Repository<DeTai>,

        @InjectRepository(ThanhVienDT)
        private TVDTRes: Repository<ThanhVienDT>
    ) { }

    async registerProject(user: any, prDto: RegisterTopicDto) {

        //kiem tra de tai
        const detai = await this.DTRes.findOne({ where: { MaDT: prDto.MaDT } });

        if (detai) {
            throw new NotFoundException('Đề tài này đã tồn tại!');
        }

        //kiem tra nguoi dang ki
        const isRegister = await this.TVDTRes.findOne({
            where: { TaiKhoan: user.TaiKhoan, MaDT: prDto.MaDT, }
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
            TrangThai: "Chờ phê duyệt",
            NgayTao: new Date()
        });
        await this.DTRes.save(project);

        //dang ki nhom truong
        const leader = this.TVDTRes.create({
            MaDT: prDto.MaDT,
            TaiKhoan: user.TaiKhoan,
            VaiTroDT: "Nhóm trưởng",
        })
        await this.TVDTRes.save(leader);

        //dang ki thanh vien
        for (const member of prDto.ThanhVienIds) {

            if (member === user.TaiKhoan) continue;
            const mb = this.TVDTRes.create({
                MaDT: prDto.MaDT,
                TaiKhoan: member,
                VaiTroDT: "Thành viên",
            });

            await this.TVDTRes.save(mb);
        }

        return { message: "Yêu cầu đăng ký đề tài của bạn đã được gửi." }
    }

    async getProject(taikhoan: string) {
        const result = await this.TVDTRes
            .createQueryBuilder("tv")
            .leftJoinAndSelect("tv.DeTai", "dt")
            .where("tv.TaiKhoan =:taikhoan", { taikhoan })
            .getMany();

        return result;
    }

    async getProjectById(id: string) {
        const project = await this.DTRes.findOne({
            where: { MaDT: id.trim() },
            relations: ['ThanhVienDT']
        });
        return project;
    }

    async getProjectByState(state: string) {
        var role = "Nhóm trưởng";
        const result = await this.DTRes
            .createQueryBuilder('dt')
            .leftJoinAndSelect('dt.ThanhVienDT', 'tv')
            .where('dt.TrangThai =:state', { state })
            .andWhere('tv.VaiTroDT =:role', { role })
            .getMany();

        return result;
    }

    async changeProjectState(id: string, state: string) {
        const changeProject = await this.DTRes.findOne({
            where: { MaDT: id }
        });

        if (!changeProject) {
            throw new NotFoundException("Không tìm thấy đề tài này");
        }
        changeProject!.TrangThai = state;
        return this.DTRes.save(changeProject);;
    }

    async deleteProject(id: string) {
        const project = await this.DTRes.findOne({
            where: { MaDT: id }
        });

        if (!project) {
            throw new NotFoundException("Không tìm thấy đề tài này");
        }
        return this.DTRes.delete(project);
    }

    async getMemberById(id: string) {
        const mem = await this.TVDTRes.find({
            where: { MaDT: id.trim() },
        });
        return mem
    }

    async updateProjectDate(id: string, dto: DateDto) {
        const project = await this.DTRes.findOne({ where: { MaDT: id } });

        if (!project) {
            throw new NotFoundException("Không tìm thấy đề tài này");
        }
        
        // Chỉ cập nhật field nào được truyền vào
        if (dto.NgayBatDau) project.NgayBatDau = new Date(dto.NgayBatDau);
        if (dto.NgayKetThuc) project.NgayKetThuc = new Date(dto.NgayKetThuc);
        if (dto.NgayXetDuyet) project.NgayXetDuyet = new Date(dto.NgayXetDuyet);

        return this.DTRes.save(project);
    }
}
