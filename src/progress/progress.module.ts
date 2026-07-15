import { forwardRef, Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MocDeTai } from 'src/entity/progress.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ThongBao } from 'src/entity/notification.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { ProjectService } from 'src/project/project.service';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { ThanhVienMocDT } from 'src/entity/pgmem.entity';
import { DocumentsModule } from 'src/documents/documents.module';
import { TaiLieu } from 'src/entity/document.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MocDeTai,
      ThongBao,
      NguoiDung,
      XetDuyetDeTai,
      DeTai,
      ThanhVienDT,
      ThanhVienMocDT,
      TaiLieu
    ]),
    DocumentsModule
  ],
  controllers: [ProgressController],
  providers: [ProgressService, NotificationsService, ProjectService],
  exports: [ProgressService]
})
export class ProgressModule { }
