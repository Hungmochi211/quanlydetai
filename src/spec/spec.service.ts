import { Injectable } from '@nestjs/common';
import { PhanLoai } from '../entity/speclist.entity';
import { ChuyenNganh } from 'src/entity/spec.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NguoiHD } from 'src/entity/teacher.entity';
import { NguoiDung } from 'src/entity/user.entity';

@Injectable()
export class SpecService {
  constructor(
    @InjectRepository(ChuyenNganh)
    private specRes: Repository<ChuyenNganh>,

    @InjectRepository(PhanLoai)
    private speclistRes: Repository<PhanLoai>,

    @InjectRepository(NguoiHD)
    private teacherRes: Repository<NguoiHD>,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,
  ) {}

  private isLecturer(role?: string) {
    return (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim() === 'giang vien';
  }

  async findAll() {
    return this.specRes.find();
  }

  async findSpecList(idspec: string) {
    if (!idspec) return [];

    const speclistfind = await this.speclistRes.find({
      where: { idChuyenNganh: idspec },
      select: ['idPhanLoai', 'TenPhanLoai', 'idChuyenNganh'],
      take: 10,
    });

    return speclistfind;
  }

  async getTeacher(teacherkey?: string) {
    const builder = this.userRes.createQueryBuilder('user')
      .select(['user.TaiKhoan', 'user.TenDayDu', 'user.VaiTro'])
      .where('user.VaiTro = :role', { role: 'Giảng viên' })
      .orderBy('user.TenDayDu', 'ASC')
      .take(20);
    if (teacherkey?.trim()) {
      builder.andWhere('(user.TaiKhoan LIKE :keyword OR user.TenDayDu LIKE :keyword)', {
        keyword: `%${teacherkey.trim()}%`,
      });
    }
    const lecturers = await builder.getMany();
    return lecturers.map((user) => ({
      value: user.TaiKhoan,
      label: user.TenDayDu ? `GV. ${user.TenDayDu}` : user.TaiKhoan,
    }));
  }

  async getTeacherBySpec(id?: string) {
    return this.getTeacher();
  }
}
