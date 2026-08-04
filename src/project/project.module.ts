import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { LichSuXetDuyetDeTai } from 'src/entity/project-approval-history.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThanhVienDT,
      DeTai,
      XetDuyetDeTai,
      LichSuXetDuyetDeTai,
      NguoiDung,
      TaiLieu,
      HoiDongDeTai,
      ThanhVienHoiDong,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule { }
