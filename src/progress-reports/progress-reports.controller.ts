import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateProgressReportDto, ReviewProgressReportDto, UpdateProgressReportDto } from 'src/dto/ProgressReportDto';
import { ProgressReportsService } from './progress-reports.service';

interface AuthenticatedRequest {
  user?: { TaiKhoan?: string };
}

@Controller('progress-reports')
@ApiTags('progress-reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class ProgressReportsController {
  constructor(private readonly progressReportsService: ProgressReportsService) {}

  @Post('project/:maDT')
  create(@Param('maDT') maDT: string, @Body() dto: CreateProgressReportDto, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.create(maDT, dto, this.account(req));
  }

  @Get('project/:maDT')
  findByProject(@Param('maDT') maDT: string, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.findByProject(maDT, this.account(req));
  }

  @Get('monitoring/projects')
  findMonitoringProjects(@Request() req: AuthenticatedRequest) {
    return this.progressReportsService.findMonitoringProjects(this.account(req));
  }

  @Get('council/projects')
  findCouncilProjects(@Request() req: AuthenticatedRequest) {
    return this.progressReportsService.findCouncilProjects(this.account(req));
  }

  @Get('council/me')
  councilMembership(@Request() req: AuthenticatedRequest) {
    return this.progressReportsService.getCouncilMembership(this.account(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.findOne(id, this.account(req));
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProgressReportDto, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.update(id, dto, this.account(req));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.remove(id, this.account(req));
  }

  @Post(':id/submit')
  submit(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.submit(id, this.account(req));
  }

  @Post(':id/review')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewProgressReportDto, @Request() req: AuthenticatedRequest) {
    return this.progressReportsService.review(id, dto, this.account(req));
  }

  private account(req: AuthenticatedRequest): string {
    const taiKhoan = req.user?.TaiKhoan;
    if (!taiKhoan) throw new BadRequestException('Không xác định được tài khoản đăng nhập');
    return taiKhoan;
  }
}
