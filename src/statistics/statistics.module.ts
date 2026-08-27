import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersModule } from 'src/admin-users/admin-users.module';
import { AuthModule } from 'src/auth/auth.module';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { PhanLoai } from 'src/entity/speclist.entity';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeTai, ThanhVienDT, PhanLoai]), AuthModule, AdminUsersModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
