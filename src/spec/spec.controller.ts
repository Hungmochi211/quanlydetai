import { Controller, Get, Param, Query } from '@nestjs/common';
import { SpecService } from './spec.service';

@Controller('spec')
export class SpecController {
  constructor(private readonly specService: SpecService) { }

  @Get('chuyennganh')
  findAll() {
    return this.specService.findAll();
  }

  @Get('phanloai/:id')
  async findSpecList(@Param('id') id: string) {
    return this.specService.findSpecList(id);
  }

  @Get('teacher')
  getTeacher(@Query('search') sreach?: string) {
    return this.specService.getTeacher(sreach);
  }

  @Get('teacherCN/:id')
  getTeacherBySpec(@Param('id') id: string) {
    return this.specService.getTeacherBySpec(id);
  }
}
