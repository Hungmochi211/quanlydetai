import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { NguoiDung } from 'src/entity/user.entity';
import { AdminGuard } from './admin.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([NguoiDung]), AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminGuard],
  exports: [AdminGuard],
})
export class AdminUsersModule {}
