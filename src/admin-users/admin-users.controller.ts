import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateUserDto,
  AdminUsersQueryDto,
} from 'src/dto/AdminUserDto';
import { AdminGuard } from './admin.guard';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':taiKhoan')
  findOne(@Param('taiKhoan') taiKhoan: string) {
    return this.adminUsersService.findOne(taiKhoan);
  }

  @Post()
  create(@Body() data: AdminCreateUserDto) {
    return this.adminUsersService.create(data);
  }

  @Patch(':taiKhoan')
  update(
    @Param('taiKhoan') taiKhoan: string,
    @Body() data: AdminUpdateUserDto,
    @Request() request,
  ) {
    return this.adminUsersService.update(taiKhoan, data, request.user.TaiKhoan);
  }

  @Post(':taiKhoan/reset-password')
  resetPassword(
    @Param('taiKhoan') taiKhoan: string,
    @Body() data: AdminResetPasswordDto,
  ) {
    return this.adminUsersService.resetPassword(taiKhoan, data);
  }
}
