import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ProgressService } from './progress.service';
import { CreateMocDeTaiDto } from 'src/dto/ProgressDto';
import { UpdateMocDeTaiDto } from 'src/dto/UpdateProgressDto';

@Controller('progress')
@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(private readonly mDTService: ProgressService) {}

  @Post('createprogress')
  create(@Body() dto: CreateMocDeTaiDto) {
    return this.mDTService.create(dto);
  }

  @Get('getprogress')
  findAll(@Query('MaDT') MaDT?: string) {
    return this.mDTService.findAll(MaDT);
  }
  @Patch('updateprogress/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMocDeTaiDto,
  ) {
    return this.mDTService.update(id, dto);
  }

  @Delete('deleteprogress/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mDTService.remove(id);
  }

  @Get('member/:maMoc')
  getMemberById(@Param('maMoc') maMoc: number) {
    return this.mDTService.getMemberById(maMoc);
  }

  // progress.controller.ts
  @Get('sumprogess/:maDT')
  async getTienDo(@Param('maDT') maDT: string) {
    return this.mDTService.updateDeTaiProgress(maDT);
  }
}
