import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/admin-users/admin.guard';
import {
  AddCouncilMemberDto,
  AssignCouncilToProjectDto,
  CreateCouncilTypeDto,
  CreateCouncilDto,
  UpdateCouncilTypeDto,
  UpdateCouncilDto,
} from 'src/dto/CouncilDto';
import { CouncilsService } from './councils.service';

@Controller('admin/councils')
@ApiTags('admin-councils')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
export class CouncilsController {
  constructor(private readonly councilsService: CouncilsService) {}

  @Get('types')
  findTypes() { return this.councilsService.findTypes(); }

  @Post('types')
  createType(@Body() dto: CreateCouncilTypeDto) { return this.councilsService.createType(dto); }

  @Patch('types/:id')
  updateType(@Param('id') id: string, @Body() dto: UpdateCouncilTypeDto) {
    return this.councilsService.updateType(Number(id), dto);
  }

  @Delete('types/:id')
  removeType(@Param('id') id: string) { return this.councilsService.removeType(Number(id)); }

  @Get()
  findAll(@Query('typeId') typeId?: string) {
    return this.councilsService.findAll(typeId ? Number(typeId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.councilsService.findOne(Number(id)); }

  @Post()
  create(@Body() dto: CreateCouncilDto) { return this.councilsService.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouncilDto) {
    return this.councilsService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.councilsService.remove(Number(id)); }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddCouncilMemberDto) {
    return this.councilsService.addMember(Number(id), dto);
  }

  @Delete(':id/members/:taiKhoan')
  removeMember(@Param('id') id: string, @Param('taiKhoan') taiKhoan: string) {
    return this.councilsService.removeMember(Number(id), taiKhoan);
  }

  @Post('projects/:maDT')
  assignToProject(@Param('maDT') maDT: string, @Body() dto: AssignCouncilToProjectDto) {
    return this.councilsService.assignToProject(maDT, dto);
  }

  @Delete('projects/:maDT/:councilId')
  removeProjectAssignment(@Param('maDT') maDT: string, @Param('councilId') councilId: string) {
    return this.councilsService.removeProjectAssignment(maDT, Number(councilId));
  }
}
