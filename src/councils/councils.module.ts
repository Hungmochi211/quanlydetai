import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersModule } from 'src/admin-users/admin-users.module';
import { AuthModule } from 'src/auth/auth.module';
import { HoiDong, HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong, YeuCauPhanCongHoiDong } from 'src/entity/council.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { HoSoNghiemThu, PhieuChamNghiemThu } from 'src/entity/acceptance.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { CouncilsController } from './councils.controller';
import { CouncilRequestsController } from './council-requests.controller';
import { CouncilsService } from './councils.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HoiDong,
      ThanhVienHoiDong,
      HoiDongDeTai,
      LoaiHoiDong,
      NguoiDung,
      DeTai,
      ThanhVienDT,
      YeuCauPhanCongHoiDong,
      HoSoNghiemThu,
      PhieuChamNghiemThu,
      XetDuyetDeTai,
    ]),
    AuthModule,
    AdminUsersModule,
    NotificationsModule,
  ],
  controllers: [CouncilsController, CouncilRequestsController],
  providers: [CouncilsService],
})
export class CouncilsModule {}
