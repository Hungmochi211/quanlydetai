import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersModule } from 'src/admin-users/admin-users.module';
import { AuthModule } from 'src/auth/auth.module';
import { HoiDong, HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong } from 'src/entity/council.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { CouncilsController } from './councils.controller';
import { CouncilsService } from './councils.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HoiDong, ThanhVienHoiDong, HoiDongDeTai, LoaiHoiDong, NguoiDung, DeTai]),
    AuthModule,
    AdminUsersModule,
  ],
  controllers: [CouncilsController],
  providers: [CouncilsService],
})
export class CouncilsModule {}
