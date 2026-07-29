import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { HoiDong, HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { HoSoNghiemThu, PhieuChamNghiemThu } from 'src/entity/acceptance.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AcceptanceController } from './acceptance.controller';
import { AcceptanceService } from './acceptance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HoSoNghiemThu,
      PhieuChamNghiemThu,
      DeTai,
      ThanhVienDT,
      TaiLieu,
      HoiDong,
      HoiDongDeTai,
      ThanhVienHoiDong,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [AcceptanceController],
  providers: [AcceptanceService],
  exports: [AcceptanceService],
})
export class AcceptanceModule { }
