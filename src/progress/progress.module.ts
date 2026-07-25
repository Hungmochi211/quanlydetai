import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MocDeTai } from 'src/entity/progress.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ThongBao } from 'src/entity/notification.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { ThanhVienMocDT } from 'src/entity/pgmem.entity';
import { DocumentsModule } from 'src/documents/documents.module';
import { TaiLieu } from 'src/entity/document.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectModule } from 'src/project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MocDeTai,
      ThongBao,
      NguoiDung,
      ThanhVienMocDT,
      TaiLieu
    ]),
    DocumentsModule,
    AuthModule,
    ProjectModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, NotificationsService],
  exports: [ProgressService]
})
export class ProgressModule { }
