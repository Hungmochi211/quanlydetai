import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMocDeTaiDto } from 'src/dto/ProgressDto';
import { UpdateMocDeTaiDto } from 'src/dto/UpdateProgressDto';
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
        private readonly deTaiRes: ProjectService
    ) { }

    async create(dto: CreateMocDeTaiDto): Promise<MocDeTai> {
        const moc = this.MDTRes.create(dto);
        await this.MDTRes.save(moc);

        for (const idTV of dto.ThanhVienIds) {
            await this.TVMDTRes.save({
                moc: moc,
                thanhVien: { idTV: idTV }
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
        Object.assign(moc, dto);
        return await this.MDTRes.save(moc);
    }

    async remove(MaMoc: number): Promise<{ message: string }> {
        const moc = await this.MDTRes.findOne({ where: { MaMoc } });
        if (!moc) {
            throw new NotFoundException(`Không tìm thấy mốc với MaMoc = ${MaMoc}`);
        }
        await this.TVMDTRes.delete({
            moc: { MaMoc },
        });

        await this.MDTRes.remove(moc);
        return { message: `Đã xóa mốc MaMoc = ${MaMoc} thành công` };
    }

    async updateDeTaiProgress(maDT: string): Promise<number> {
        const mocs = await this.MDTRes.find({
            where: { MaDT: maDT }
        });

        if (mocs.length === 0) return 0;

        let tongTrongSoTatCa = 0;
        let tongTrongSoHoanThanh = 0;

        for (const moc of mocs) {
            const trongSo = Number(moc.TrongSo) || 0;
            tongTrongSoTatCa += trongSo;

            if (moc.TrangThai === 'Hoàn thành') {
                tongTrongSoHoanThanh += trongSo;
            }
        }

        let phanTramTienDo = 0;
        if (tongTrongSoTatCa > 0) {
            phanTramTienDo = Math.round((tongTrongSoHoanThanh / tongTrongSoTatCa) * 100);
        }

        // Cập nhật vào bảng DeTai
        await this.deTaiRes.updateTienDoProject(maDT, phanTramTienDo);

        return phanTramTienDo;
    }

    async getMemberById(maMoc: number) {
        const mems = await this.TVMDTRes.find({
            where: { moc: { MaMoc: maMoc } },
            relations: {
                thanhVien: {
                    NguoiDung: true
                }
            },
            select: {
                Id: true,
                thanhVien: {
                    idTV: true,
                    VaiTroDT: true,
                    NguoiDung: {
                        TaiKhoan: true,
                        TenDayDu: true,
                        VaiTro: true
                    }
                }
            }
        });

        if (!mems) {
            return "Không tìm mã mốc trong đề tài";
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