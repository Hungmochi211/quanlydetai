import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateProjectCommentDto, UpdateProjectCommentDto } from 'src/dto/ProjectCommentDto';
import { CommentsService } from './comments.service';

@Controller('comments')
@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('project/:maDT')
  findByProject(@Param('maDT') maDT: string) {
    return this.commentsService.findByProject(maDT);
  }

  @Post('project/:maDT')
  create(@Param('maDT') maDT: string, @Body() dto: CreateProjectCommentDto, @Req() req) {
    return this.commentsService.create(maDT, dto, req.user.TaiKhoan);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateProjectCommentDto, @Req() req) {
    return this.commentsService.update(Number(id), dto, req.user.TaiKhoan);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Req() req) {
    return this.commentsService.remove(Number(id), req.user.TaiKhoan);
  }
}
