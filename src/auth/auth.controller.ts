import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from 'src/dto/LoginDto';
import { RegisterDto } from 'src/dto/RegisterDto';

@Controller('auth')
@ApiTags('auth')
export class AuthCotroller {
  constructor(private authService: AuthService) {}

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
  updateProfile(@Request() req, @Body() body) {
    return this.authService.updateProfile(req.user.TaiKhoan, body);
  }
}
