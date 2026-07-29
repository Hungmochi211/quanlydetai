import { Body, Controller, Post, Get, UseGuards, Req, Param, Patch, Delete, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { DateDto } from 'src/dto/DateDto';
import { UpdateProjectDto } from 'src/dto/UpdateProjectDto';
import { ReviewProjectDto, SubmitProjectForApprovalDto } from 'src/dto/ProjectApprovalDto';

@Controller('project')
@ApiTags('project')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @Post('registerproject')
  async registerProject(@Req() req: Request, @Body() prDto: RegisterTopicDto) {
    const user = req['user'];

    return this.projectService.registerProject(user, prDto);
  }

  @Get('getproject')
  async getProject(@Req() req) {
    return this.projectService.getProject(req.user.TaiKhoan);
  }

  @Get('state/:state')
  getProjectByState(@Param('state') state: string) {
    return this.projectService.getProjectByState(state);
  }

  @Patch('changestate/:id')
  changeProjectState(@Param('id') id: string, @Body('state') state: string, @Req() req) {
    return this.projectService.changeProjectState(id, state, req.user.TaiKhoan);
  }

  @Post(':id/submit-for-approval')
  submitForApproval(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: SubmitProjectForApprovalDto,
  ) {
    return this.projectService.submitForApproval(id, req.user.TaiKhoan, dto);
  }

  @Post(':id/review')
  reviewProject(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: ReviewProjectDto,
  ) {
    return this.projectService.reviewProject(id, req.user.TaiKhoan, dto);
  }

  @Get(':id/approvals')
  getApprovals(@Param('id') id: string) {
    return this.projectService.getApprovals(id);
  }

  @Get('member/:id')
  getMemberById(@Param('id') id: string) {
    return this.projectService.getMemberById(id);
  }

  @Get('leader/:id')
  getMemberByRole(@Param('id') id: string) {
    return this.projectService.getLeaderById(id);
  }

  @Delete('deleteproject/:id')
  deleteProject(@Param('id') id: string, @Req() req) {
    return this.projectService.deleteProject(id, req.user.TaiKhoan);
  }

  @Patch('updateproject/:id')
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req) {
    return this.projectService.updateProject(id, dto, req.user.TaiKhoan);
  }

  @Patch('updatedate/:id')
  updateProjectDate(@Param('id') id: string, @Body() dto: DateDto, @Req() req) {
    return this.projectService.updateProjectDate(id, dto, req.user.TaiKhoan);
  }

  @Get('/:id')
  async getProjectById(@Param('id') id: string) {
    return await this.projectService.getProjectById(id);
  }
}
