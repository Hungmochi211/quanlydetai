import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  AdjustmentRequestQueryDto,
  ApplyAdjustmentRequestDto,
  AdminReviewAdjustmentRequestDto,
  CreateAdjustmentRequestDto,
} from 'src/dto/AdjustmentRequestDto';
import { AdjustmentRequestsService } from './adjustment-requests.service';

interface AuthenticatedRequest {
  user?: { TaiKhoan?: string };
}

@Controller('adjustment-requests')
@ApiTags('adjustment-requests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AdjustmentRequestsController {
  constructor(private readonly adjustmentRequestsService: AdjustmentRequestsService) {}

  @Post('project/:maDT')
  create(@Param('maDT') maDT: string, @Body() dto: CreateAdjustmentRequestDto, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.create(maDT, dto, this.account(req));
  }

  @Get('my')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.findMine(this.account(req));
  }

  @Get('admin')
  findAllForAdmin(@Query() query: AdjustmentRequestQueryDto, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.findAllForAdmin(this.account(req), query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.findOne(id, this.account(req));
  }

  @Post(':id/resubmit')
  resubmit(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateAdjustmentRequestDto, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.resubmit(id, dto, this.account(req));
  }

  @Post(':id/review')
  review(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminReviewAdjustmentRequestDto, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.review(id, dto, this.account(req));
  }

  @Post(':id/apply')
  apply(@Param('id', ParseIntPipe) id: number, @Body() dto: ApplyAdjustmentRequestDto, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.apply(id, dto, this.account(req));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.adjustmentRequestsService.remove(id, this.account(req));
  }

  private account(req: AuthenticatedRequest) {
    if (!req.user?.TaiKhoan) throw new BadRequestException('Không xác định được tài khoản đăng nhập');
    return req.user.TaiKhoan;
  }
}
