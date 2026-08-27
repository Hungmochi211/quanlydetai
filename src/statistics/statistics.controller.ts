import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminGuard } from 'src/admin-users/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { StatisticsExportQueryDto, StatisticsQueryDto } from 'src/dto/StatisticsDto';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @UseGuards(AdminGuard)
  overview(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getOverview(query);
  }

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@Query() query: StatisticsExportQueryDto, @Res() response: Response) {
    const file = await this.statisticsService.exportReport(query);
    response
      .setHeader('Content-Type', file.contentType)
      .setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
      .send(file.buffer);
  }

  @Get('my-topics')
  myTopics(@Req() request: { user: { TaiKhoan: string } }) {
    return this.statisticsService.getMyTopicStatistics(request.user.TaiKhoan);
  }

  @Get('my-topics/export')
  async exportMyTopics(
    @Req() request: { user: { TaiKhoan: string } },
    @Query() query: StatisticsExportQueryDto,
    @Res() response: Response,
  ) {
    const file = await this.statisticsService.exportMyTopicsReport(request.user.TaiKhoan, query);
    response
      .setHeader('Content-Type', file.contentType)
      .setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
      .send(file.buffer);
  }
}
