import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateCouncilAssignmentRequestDto } from 'src/dto/CouncilDto';
import { CouncilsService } from './councils.service';

@Controller('council-requests')
@ApiTags('council-requests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CouncilRequestsController {
  constructor(private readonly councilsService: CouncilsService) {}

  @Post('projects/:maDT')
  create(
    @Param('maDT') maDT: string,
    @Req() req,
    @Body() dto: CreateCouncilAssignmentRequestDto,
  ) {
    return this.councilsService.createAssignmentRequest(maDT, req.user.TaiKhoan, dto);
  }

  @Get('types')
  findTypes() {
    return this.councilsService.findTypes();
  }

  @Post(':id/resubmit')
  resubmit(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: CreateCouncilAssignmentRequestDto,
  ) {
    return this.councilsService.resubmitAssignmentRequest(Number(id), req.user.TaiKhoan, dto);
  }

  @Get('my')
  findMyRequests(@Req() req) {
    return this.councilsService.findMyRequests(req.user.TaiKhoan);
  }
}
