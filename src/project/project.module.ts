import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { DeTai } from 'src/entity/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThanhVienDT, DeTai])],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
