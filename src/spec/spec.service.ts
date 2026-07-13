import { Injectable } from '@nestjs/common';
import { PhanLoai } from '../entity/speclist.entity';
import { ChuyenNganh } from 'src/entity/spec.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NguoiHD } from 'src/entity/teacher.entity';

@Injectable()
export class SpecService {
  constructor(
    @InjectRepository(ChuyenNganh)
    private specRes: Repository<ChuyenNganh>,

    @InjectRepository(PhanLoai)
    private speclistRes: Repository<PhanLoai>,

    @InjectRepository(NguoiHD)
    private teacherRes: Repository<NguoiHD>,
  ) {}

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
    const listTC = await this.teacherRes.find({ relations: ['NguoiDung'] });
    const filName = teacherkey
      ? listTC.filter((x) =>
          (x.NguoiDung.TenDayDu + '' + x.HocHamHocVi)
            .toLowerCase()
            .includes(teacherkey.toLowerCase()),
        )
      : listTC;

    return filName.map((x) => ({
      value: x.idNguoiHD,
      label: `${x.HocHamHocVi}. ${x.NguoiDung.TenDayDu}`,
    }));
  }

  async getTeacherBySpec(id?: string) {
    const listfind = await this.teacherRes.find({
      where: { idChuyenNganh: id },
      relations: ['NguoiDung', 'ChuyenNganh'],
    });

    return listfind.map((x) => ({
      value: x.idNguoiHD,
      label: `${x.HocHamHocVi}. ${x.NguoiDung.TenDayDu}`,
    }));
  }
}
