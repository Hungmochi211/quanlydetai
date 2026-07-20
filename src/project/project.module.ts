import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ThanhVienDT, DeTai, XetDuyetDeTai, NguoiDung]), AuthModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule { }
