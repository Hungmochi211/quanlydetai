import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentsService } from 'src/documents/documents.service';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { CreateMocDeTaiDto } from 'src/dto/ProgressDto';
import { UpdateMocDeTaiDto } from 'src/dto/UpdateProgressDto';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienMocDT } from 'src/entity/pgmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ProjectService } from 'src/project/project.service';
import { Repository } from 'typeorm';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(MocDeTai)
    private MDTRes: Repository<MocDeTai>,

    @InjectRepository(ThanhVienMocDT)
    private TVMDTRes: Repository<ThanhVienMocDT>,

    private readonly NTFService: NotificationsService,
    private readonly deTaiRes: ProjectService,
    private readonly TLService: DocumentsService
  ) { }

  async create(dto: CreateMocDeTaiDto): Promise<MocDeTai> {

    // Lấy tất cả mốc của đề tài
    const mocs = await this.MDTRes.find({
      where: {
        MaDT: dto.MaDT,
      },
    });

    // Tính tổng trọng số hiện tại
    const tongTrongSo = mocs.reduce(
      (sum, moc) => sum + (Number(moc.TrongSo) || 0),
      0,
    );

    const trongSoMoi = Number(dto.TrongSo) || 0;

    if (tongTrongSo + trongSoMoi > 100) {
      throw new BadRequestException(
        `Tổng trọng số của đề tài sẽ là ${tongTrongSo + trongSoMoi}%, vượt quá 100%.`,
      );
    }

    const moc = this.MDTRes.create(dto);
    await this.MDTRes.save(moc);

    for (const idTV of dto.ThanhVienIds) {
      await this.TVMDTRes.save({
        moc,
        thanhVien: { idTV },
      });
    }

    return moc;
  }

  async findAll(MaDT?: string): Promise<MocDeTai[]> {
    const where = MaDT ? { MaDT } : {};
    return await this.MDTRes.find({
      where,
      relations: ['deTai'],
      order: { ThuTu: 'ASC' },
    });
  }

  async update(MaMoc: number, dto: UpdateMocDeTaiDto): Promise<MocDeTai> {
    const moc = await this.MDTRes.findOne({ where: { MaMoc } });
    if (!moc) {
      throw new NotFoundException(`Không tìm thấy mốc với MaMoc = ${MaMoc}`);
    }
    const { ThanhVienIds, ...mocData } = dto;
    Object.assign(moc, mocData);
    const savedMoc = await this.MDTRes.save(moc);

    // Chỉ thay đổi phân công khi frontend gửi trường này. Điều này tránh
    // xóa danh sách hiện có ở những lần cập nhật không liên quan.
    if (ThanhVienIds !== undefined) {
      const uniqueMemberIds = [...new Set(ThanhVienIds)];
      await this.TVMDTRes.delete({ moc: { MaMoc } });

      if (uniqueMemberIds.length > 0) {
        await this.TVMDTRes.save(
          uniqueMemberIds.map((idTV) => ({
            moc: savedMoc,
            thanhVien: { idTV },
          })),
        );
      }
    }

    return savedMoc;
  }

  async remove(MaMoc: number): Promise<{ message: string }> {
    const moc = await this.MDTRes.findOne({ where: { MaMoc } });
    if (!moc) {
      throw new NotFoundException(`Không tìm thấy mốc với MaMoc = ${MaMoc}`);
    }

    await this.TLService.removeByMilestone(MaMoc);
    await this.TVMDTRes.delete({ moc: { MaMoc }, });
    await this.MDTRes.remove(moc);
    await this.updateDeTaiProgress(moc.MaDT)
    return { message: `Đã xóa mốc MaMoc = ${MaMoc} thành công` };
  }

  async submitMilestone( dto: AddTaiLieuDto, file: Express.Multer.File, taiKhoan: string,): Promise<TaiLieu> {

    const taiLieu = await this.TLService.upload( dto, file, taiKhoan,);

    // Nếu upload cho mốc
    if (dto.MaMoc) {
      await this.completeMilestone(dto!.MaMoc);
    }

    return taiLieu;
  }

  async completeMilestone(MaMoc: number): Promise<MocDeTai> {
    const moc = await this.MDTRes.findOne({
      where: { MaMoc },
    });

    if (!moc) {
      throw new NotFoundException(
        `Không tìm thấy mốc với MaMoc = ${MaMoc}`,
      );
    }

    // Nếu đã hoàn thành thì không cần cập nhật nữa
    if (moc.TrangThai === 'Hoàn thành') {
      return moc;
    }

    moc.TrangThai = 'Hoàn thành';

    const result = await this.MDTRes.save(moc);

    // Cập nhật lại tiến độ đề tài
    await this.updateDeTaiProgress(result.MaDT);

    return result;
  }

  async updateDeTaiProgress(maDT: string): Promise<number> {
    const mocs = await this.MDTRes.find({
      where: { MaDT: maDT },
    });

    let phanTramTienDo = 0;

    for (const moc of mocs) {
      if (moc.TrangThai === 'Hoàn thành') {
        phanTramTienDo += Number(moc.TrongSo) || 0;
      }
    }

    // Đảm bảo không vượt quá 100%
    phanTramTienDo = Math.min(phanTramTienDo, 100);

    await this.deTaiRes.updateTienDoProject(maDT, phanTramTienDo);

    return phanTramTienDo;
  }

  async getMemberById(maMoc: number) {
    const mems = await this.TVMDTRes.find({
      where: { moc: { MaMoc: maMoc } },
      relations: {
        thanhVien: {
          NguoiDung: true,
        },
      },
      select: {
        Id: true,
        thanhVien: {
          idTV: true,
          VaiTroDT: true,
          NguoiDung: {
            TaiKhoan: true,
            TenDayDu: true,
            VaiTro: true,
          },
        },
      },
    });

    if (!mems) {
      return 'Không tìm mã mốc trong đề tài';
    }
    return mems;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoCheckDeadlines() {
    await this.checkOverDeadline();
    await this.checkUpcomingDeadline();
  }

  async checkOverDeadline(): Promise<void> {
    const mocs = await this.MDTRes.find({
      relations: {
        thanhVienMocs: true,
        deTai: true,
      },
    });
    const now = new Date();
    const updateMocs: MocDeTai[] = [];

    for (const moc of mocs) {
      if (
        moc.NgayKetThuc < now &&
        moc.TrangThai !== 'Hoàn thành' &&
        moc.TrangThai !== 'Trễ hạn'
      ) {
        moc.TrangThai = 'Trễ hạn';
        updateMocs.push(moc);

        // tao thong bao
        if (moc.thanhVienMocs && moc.thanhVienMocs.length > 0) {
          for (const tv of moc.thanhVienMocs) {
            await this.NTFService.create(null, {
              TkNguoiNhan: tv.thanhVien.TaiKhoan,
              TieuDe: 'Cảnh báo: Mốc đề tài đã QUÁ HẠN',
              NoiDung: `"${moc.TenMoc}" thuộc đề tài ${moc.MaDT} của bạn đã trễ hạn!`,
              NgayTao: new Date(),
            });
          }
        }
      }
    }

    if (updateMocs.length > 0) {
      await this.MDTRes.save(updateMocs);
    }
  }

  async checkUpcomingDeadline(daysBefore: number = 3): Promise<void> {
    const mocs = await this.MDTRes.find({
      relations: {
        thanhVienMocs: true,
        deTai: true,
      },
    });
    const now = new Date();
    const warningThreshold = new Date();
    warningThreshold.setDate(now.getDate() + daysBefore);
    const updatedMocs: MocDeTai[] = [];

    for (const moc of mocs) {
      if (
        moc.NgayKetThuc >= now &&
        moc.NgayKetThuc <= warningThreshold &&
        moc.TrangThai !== 'Hoàn thành' &&
        moc.TrangThai !== 'Trễ hạn' &&
        moc.TrangThai !== 'Sắp trễ hạn'
      ) {
        moc.TrangThai = 'Sắp trễ hạn';
        updatedMocs.push(moc);

        if (moc.thanhVienMocs && moc.thanhVienMocs.length > 0) {
          for (const tv of moc.thanhVienMocs) {
            await this.NTFService.create(null, {
              TkNguoiNhan: tv.thanhVien.TaiKhoan,
              TieuDe: 'Cảnh báo: Mốc đề tài SẮP ĐẾN HẠN',
              NoiDung: `"${moc.TenMoc}" thuộc đề tài ${moc.MaDT} của bạn sắp trễ hạn!`,
              NgayTao: new Date(),
            });
          }
        }
      }
    }

    if (updatedMocs.length > 0) {
      await this.MDTRes.save(updatedMocs);
    }
  }
}
