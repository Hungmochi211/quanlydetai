import { Body, Controller, Post, UseGuards, Get, Request, Put, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginDto } from 'src/dto/LoginDto';
import { RegisterDto } from 'src/dto/RegisterDto';
import { UpdateProfileDto } from 'src/dto/UpdateProfileDto';
import { avatarMulterOptions } from './avatar-multer.config';

@Controller('auth')
@ApiTags('auth')
export class AuthCotroller {
  constructor(private authService: AuthService) { }

  @Post('login')
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.signIn(signInDto.TaiKhoan, signInDto.MatKhau);
  }

  @Post('register')
  register(@Body() RegisterDto: RegisterDto) {
    return this.authService.register(RegisterDto);
  }

  @Post('forgotpassword')
  forgot(@Body('gmail') email: string) {
    return this.authService.fogortPassword(email);
  }

  @Post('resetpassword')
  reset(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.TaiKhoan);
  }

  @Put('profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.TaiKhoan, body);
  }

  @Post('avatar')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.authService.uploadAvatar(req.user.TaiKhoan, file);
  }

  @Delete('avatar')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  removeAvatar(@Request() req) {
    return this.authService.removeAvatar(req.user.TaiKhoan);
  }
}
