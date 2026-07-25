import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from 'src/dto/RegisterDto';
import { UpdateProfileDto } from 'src/dto/UpdateProfileDto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';
import { sendMail } from './gmail';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,
  ) {}

  async signIn(
    TaiKhoan: string,
    MatKhau: string,
  ): Promise<{ access_token: string; requiresProfileCompletion: boolean }> {
    const user = await this.userService.findOne(TaiKhoan);
    if (!user) throw new UnauthorizedException('Sai tài khoản');
    const checkPass = await bcrypt.compare(MatKhau, user.MatKhau);
    if (!checkPass) {
      throw new UnauthorizedException('Sai mật khẩu hoặc tài khoản');
    }
    const payload = {
      TaiKhoan: user.TaiKhoan,
      TenDayDu: user.TenDayDu,
      VaiTro: user.VaiTro,
      SDT: user.SDT,
      Gmail: user.Gmail,
      DaHoanThienHoSo: user.DaHoanThienHoSo,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      requiresProfileCompletion: !user.DaHoanThienHoSo,
    };
  }

  async register(RegisterDto: RegisterDto) {
    const checkUser = await this.userService.findOne(RegisterDto.TaiKhoan);
    if (checkUser) throw new BadRequestException('Tài khoản đã tồn tại');

    const passHash = await bcrypt.hash(RegisterDto.MatKhau, 10);
    const newUser = this.userRes.create({
      Gmail: RegisterDto.Gmail,
      TaiKhoan: RegisterDto.TaiKhoan,
      MatKhau: passHash,
      TenDayDu: RegisterDto.TenDayDu,
      VaiTro: 'Sinh viên',
      DaHoanThienHoSo: true,
    });
    const user = await this.userRes.save(newUser);
    delete (user as any).MatKhau;
    return user;
  }

  async fogortPassword(gmail: string) {
    if (!gmail) throw new NotFoundException('Email khong hop le!');

    const user = await this.userRes.findOne({ where: { Gmail: gmail } });
    if (!user) throw new NotFoundException('Gmail không tồn tại');

    const token = this.jwtService.sign(
      { userName: user.TaiKhoan },
      { expiresIn: '10m' },
    );

    user.ResetToken = token;
    user.ResetTokenExpire = new Date(Date.now() + 15 * 60 * 1000);
    await this.userRes.save(user);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/change-password?token=${token}`;

    await sendMail(
      gmail,
      resetLink,
      this.configService.getOrThrow<string>('MAIL_USER'),
      this.configService.getOrThrow<string>('MAIL_PASSWORD'),
    );

    return { message: 'Đã gửi đến gmail khôi phục mật khẩu' };
  }

  async resetPassword(token: string, newPassword: string) {
    const payload = this.jwtService.verify(token);

    const user = await this.userRes.findOne({
      where: {
        TaiKhoan: payload.userName,
        ResetToken: token,
      },
    });

    if (!user || user.ResetTokenExpire < new Date())
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');

    user.MatKhau = await bcrypt.hash(newPassword, 10);
    user.ResetToken = null as any;
    user.ResetTokenExpire = null as any;

    await this.userRes.save(user);
    return { message: 'Đổi mật khẩu thành công' };
  }

  async updateProfile(TaiKhoan: string, data: UpdateProfileDto) {
    const currentUser = await this.userRes.findOne({ where: { TaiKhoan } });
    if (!currentUser) throw new NotFoundException('Không tìm thấy tài khoản');

    const nextFullName = data.TenDayDu ?? currentUser.TenDayDu;
    const nextEmail = data.Gmail ?? currentUser.Gmail;
    if (!currentUser.DaHoanThienHoSo && (!nextFullName?.trim() || !nextEmail?.trim())) {
      throw new BadRequestException('Vui lòng nhập họ tên và email để hoàn thiện hồ sơ');
    }

    const allowedData = Object.fromEntries(
      Object.entries({
        TenDayDu: data.TenDayDu,
        Gmail: data.Gmail,
        SDT: data.SDT,
      }).filter(([, value]) => value !== undefined),
    );

    await this.userRes.update(
      { TaiKhoan },
      { ...allowedData, DaHoanThienHoSo: true },
    );

    return { message: 'Cập nhật thành công' };
  }

  async getProfile(TaiKhoan: string) {
    const user = await this.userRes.findOne({
      where: { TaiKhoan: TaiKhoan },
      select: ['TaiKhoan', 'TenDayDu', 'SDT', 'Gmail', 'VaiTro', 'DaHoanThienHoSo'],
    });

    return user;
  }
}
