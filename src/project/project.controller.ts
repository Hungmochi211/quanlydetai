import { Body, Controller, Post, Get, UseGuards, Req, Param, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { RegisterTopicDto } from 'src/dto/RegisterTopicDto';
import { DateDto } from 'src/dto/DateDto';

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
        return this.projectService.getProject(req.user.TaiKhoan)
    }

    @Get('state/:state')
    getProjectByState(@Param('state') state: string) {
        return this.projectService.getProjectByState(state);
    }

    @Patch("changestate/:id")
    changeProjectState(@Param("id") id: string, @Body('state') state: string) {
        return this.projectService.changeProjectState(id, state);
    }

    @Get('member/:id')
    getMemberById(@Param('id') id: string) {
        return this.projectService.getMemberById(id);
    }

    @Delete('deleteproject/:id')
    deleteProject(@Param("id") id: string) {
        return this.projectService.deleteProject(id);
    }

    @Patch('updatedate/:id')
    updateProjectDate( @Param('id') id: string, @Body() dto: DateDto ) {
        return this.projectService.updateProjectDate(id, dto);
    }

    @Get('/:id')
    async getProjectById(@Param('id') id: string) {
        return await this.projectService.getProjectById(id);
    }
}