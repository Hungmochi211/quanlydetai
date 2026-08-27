import { Module } from '@nestjs/common';
import { SpecService } from './spec.service';
import { SpecController } from './spec.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChuyenNganh } from 'src/entity/spec.entity';
import { PhanLoai } from 'src/entity/speclist.entity';
import { NguoiHD } from 'src/entity/teacher.entity';
import { NguoiDung } from 'src/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChuyenNganh, PhanLoai, NguoiHD, NguoiDung])],
  controllers: [SpecController],
  providers: [SpecService],
})
export class SpecModule {}
