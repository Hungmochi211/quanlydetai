import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateAcceptanceDossierDto, FinalizeAcceptanceDto, SubmitAcceptanceScoreDto, UpdateAcceptanceDossierDto, } from 'src/dto/AcceptanceDto';
import { AcceptanceService } from './acceptance.service';

@Controller('acceptance')
@ApiTags('acceptance')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AcceptanceController {
  constructor(private readonly service: AcceptanceService) { }
  @Post('project/:maDT') create(@Param('maDT') maDT: string, @Body() dto: CreateAcceptanceDossierDto, @Request() req: any) {
    return this.service.createDraft(maDT, dto, this.account(req));
  }
  @Get('project/:maDT') findByProject(@Param('maDT') maDT: string, @Request() req: any) {
    return this.service.findByProject(maDT, this.account(req));
  }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAcceptanceDossierDto, @Request() req: any) {
    return this.service.updateDraft(id, dto, this.account(req));
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, this.account(req));
  }
  @Post(':id/submit') submit(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.submit(id, this.account(req));
  }
  @Post(':id/scores') score(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitAcceptanceScoreDto, @Request() req: any) {
    return this.service.submitScore(id, dto, this.account(req));
  }
  @Post(':id/finalize') finalize(@Param('id', ParseIntPipe) id: number, @Body() dto: FinalizeAcceptanceDto, @Request() req: any) {
    return this.service.finalize(id, dto, this.account(req));
  }
  private account(req: any): string {
    if (!req.user?.TaiKhoan)
      throw new BadRequestException('Không xác định được tài khoản đăng nhập');
    return req.user.TaiKhoan;
  }
}
