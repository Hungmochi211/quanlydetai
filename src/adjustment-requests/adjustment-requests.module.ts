import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { YeuCauDieuChinhDeTai } from 'src/entity/adjustment-request.entity';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { TaiLieu } from 'src/entity/document.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { AdjustmentRequestsController } from './adjustment-requests.controller';
import { AdjustmentRequestsService } from './adjustment-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([YeuCauDieuChinhDeTai, DeTai, ThanhVienDT, MocDeTai, TaiLieu, NguoiDung]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [AdjustmentRequestsController],
  providers: [AdjustmentRequestsService],
})
export class AdjustmentRequestsModule {}
