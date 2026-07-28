import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { NhanXetDeTai } from 'src/entity/project-comment.entity';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [TypeOrmModule.forFeature([NhanXetDeTai, DeTai, NguoiDung, HoiDongDeTai, ThanhVienHoiDong]), AuthModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
