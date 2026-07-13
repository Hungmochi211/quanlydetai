import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  async Login(@Body() Body: { TaiKhoan: string; MatKhau: string }) {
    console.log('Body nhận từ FE:', Body);
    return await this.userService.Login(Body.TaiKhoan, Body.MatKhau);
  }

  @Get('sreach')
  async checkTaiKhoan(@Query('userkey') userkey: string) {
    return this.userService.checkTaiKhoan(userkey);
  }

  @Get('getuser/:id')
  async findUserByTk(@Param('id') id: string) {
    return this.userService.findUserByTk(id);
  }

  @Get('roleuser/:role')
  async findUserByRole(@Param('role') role: string) {
    return this.userService.findUserByRole(role);
  }
}
