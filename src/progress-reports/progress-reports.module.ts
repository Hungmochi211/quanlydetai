import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong, YeuCauPhanCongHoiDong } from 'src/entity/council.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { BaoCaoTienDo } from 'src/entity/progress-report.entity';
import { PhanHoiBaoCaoTienDo } from 'src/entity/progress-report-review.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ProgressReportsController } from './progress-reports.controller';
import { ProgressReportsService } from './progress-reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BaoCaoTienDo,
      PhanHoiBaoCaoTienDo,
      DeTai,
      ThanhVienDT,
      MocDeTai,
      TaiLieu,
      HoiDongDeTai,
      ThanhVienHoiDong,
      LoaiHoiDong,
      YeuCauPhanCongHoiDong,
      NguoiDung,
    ]),
    AuthModule,
    DocumentsModule,
    NotificationsModule,
  ],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
})
export class ProgressReportsModule {}
