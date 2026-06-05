import { Body, Controller, Post, Get, Req, UseGuards, Patch, Param, Delete, ParseIntPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { NotificationDto } from "src/dto/notificationDto";
import { AuthGuard } from "src/auth/auth.guard";

@Controller('notifications')
@ApiTags('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationsService) { }

    @Post('createnotifi')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    async create(@Req() req: Request, @Body() createNoti: NotificationDto) {
        const user = req['user'];

        return this.notificationService.create(user, createNoti);
    }

    @Delete()
    async removeNotifications(@Body() dto: { ids: number[] }) {
        await this.notificationService.removeNotifications(dto.ids);

    }

    @Get('getnotifi')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    async getNotification(@Req() req) {
        return this.notificationService.getNotification(req.user.TaiKhoan)
    }

    @Patch("read/:id")
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    changeState(@Param("id") id: number, @Req() req) {
        const user = req.user;
        return this.notificationService.changeState(id, user);
    }

    @Delete(':id')
    async removeNotification(@Param('id', ParseIntPipe) id: number) {
        await this.notificationService.removeNotification(id);
    }
}