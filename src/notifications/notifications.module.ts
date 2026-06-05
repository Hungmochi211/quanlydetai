import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { ThongBao } from 'src/entity/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import { NotificationController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThongBao,NguoiDung]),
  ],
  providers: [NotificationsGateway, NotificationsService],
  controllers: [NotificationController],
  exports: [NotificationsGateway,NotificationsService]
})
export class NotificationsModule {}
