import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { AuthModule } from 'src/auth/auth.module';
import { BaoCaoTienDo } from 'src/entity/progress-report.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { HoSoNghiemThu } from 'src/entity/acceptance.entity';
import { NguoiDung } from 'src/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaiLieu,
      ThanhVienDT,
      MocDeTai,
      XetDuyetDeTai,
      BaoCaoTienDo,
      HoSoNghiemThu,
      HoiDongDeTai,
      ThanhVienHoiDong,
      NguoiDung,
    ]),
    AuthModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
