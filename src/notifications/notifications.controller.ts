import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from 'src/dto/notificationDto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Post('createnotifi')
  async create(@Req() req: Request, @Body() createNoti: NotificationDto) {
    const user = req['user'];

    return this.notificationService.create(user, createNoti);
  }

  @Delete()
  async removeNotifications(@Req() req, @Body() dto: { ids: number[] }) {
    await this.notificationService.removeNotifications(dto.ids, req.user.TaiKhoan);
  }

  @Get('getnotifi')
  async getNotification(@Req() req) {
    return this.notificationService.getNotification(req.user.TaiKhoan);
  }

  @Patch('read/:id')
  changeState(@Param('id') id: number, @Req() req) {
    const user = req.user;
    return this.notificationService.changeState(id, user);
  }

  @Delete(':id')
  async removeNotification(@Param('id', ParseIntPipe) id: number, @Req() req) {
    await this.notificationService.removeNotification(id, req.user.TaiKhoan);
  }
}
