import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { NguoiDung } from 'src/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThanhVienDT, DeTai, XetDuyetDeTai, NguoiDung])],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
