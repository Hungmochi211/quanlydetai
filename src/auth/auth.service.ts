import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from 'src/dto/RegisterDto';
import { UpdateProfileDto } from 'src/dto/UpdateProfileDto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { sendMail, sendVerificationEmail } from './gmail';
import { AVATAR_UPLOAD_DIR } from './avatar-multer.config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,
  ) { }

  async signIn(
    TaiKhoan: string,
    MatKhau: string,
  ): Promise<{ access_token: string; requiresProfileCompletion: boolean }> {
    const user = await this.userService.findOne(TaiKhoan);
    if (!user) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    const checkPass = await bcrypt.compare(MatKhau, user.MatKhau);
    if (!checkPass) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const hasCompletedProfile = Boolean(
      user.DaHoanThienHoSo || (user.TenDayDu?.trim() && user.Gmail?.trim())
    );

    if (!user.DaHoanThienHoSo && hasCompletedProfile) {
      user.DaHoanThienHoSo = true;
      await this.userRes.update({ TaiKhoan: user.TaiKhoan }, { DaHoanThienHoSo: true });
    }

    const payload = {
      TaiKhoan: user.TaiKhoan,
      TenDayDu: user.TenDayDu,
      VaiTro: user.VaiTro,
      SDT: user.SDT,
      Gmail: user.Gmail,
      DaHoanThienHoSo: hasCompletedProfile,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      requiresProfileCompletion: !hasCompletedProfile,
    };
  }

  private verificationCodes = new Map<string, { code: string; expiresAt: number }>();

  async sendVerificationCode(gmail: string, taiKhoan?: string) {
    if (!gmail || !gmail.trim()) {
      throw new BadRequestException('Vui lòng nhập địa chỉ Gmail');
    }
    const normalizedEmail = gmail.trim().toLowerCase();

    // Kiểm tra trùng Gmail trong hệ thống
    const existingEmail = await this.userRes.findOne({
      where: { Gmail: normalizedEmail },
    });
    if (existingEmail) {
      throw new BadRequestException('Gmail này đã được sử dụng bởi một tài khoản khác');
    }

    // Nếu có truyền kèm tài khoản, kiểm tra trùng tài khoản luôn
    if (taiKhoan && taiKhoan.trim()) {
      const existingUser = await this.userService.findOne(taiKhoan.trim());
      if (existingUser) {
        throw new BadRequestException('Tài khoản này đã tồn tại');
      }
    }

    // Tạo mã ngẫu nhiên 6 chữ số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    this.verificationCodes.set(normalizedEmail, { code, expiresAt });

    try {
      await sendVerificationEmail(
        normalizedEmail,
        code,
        this.configService.getOrThrow<string>('MAIL_USER'),
        this.configService.getOrThrow<string>('MAIL_PASSWORD'),
      );
    } catch (error: any) {
      this.verificationCodes.delete(normalizedEmail);
      throw new BadRequestException('Không thể gửi mã xác nhận đến email này, vui lòng kiểm tra lại');
    }

    return { message: 'Đã gửi mã xác nhận 6 số đến Gmail của bạn. Mã có hiệu lực trong 5 phút.' };
  }

  async register(RegisterDto: RegisterDto) {
    const taiKhoan = RegisterDto.TaiKhoan.trim();
    const normalizedEmail = RegisterDto.Gmail.trim().toLowerCase();

    // 1. Kiểm tra tài khoản đã tồn tại chưa
    const checkUser = await this.userService.findOne(taiKhoan);
    if (checkUser) throw new BadRequestException('Tài khoản đã tồn tại');

    // 2. Kiểm tra trùng Gmail
    const checkGmail = await this.userRes.findOne({ where: { Gmail: normalizedEmail } });
    if (checkGmail) throw new BadRequestException('Gmail này đã được sử dụng bởi một tài khoản khác');

    // 3. Xác minh mã OTP 6 số
    const stored = this.verificationCodes.get(normalizedEmail);
    if (!stored) {
      throw new BadRequestException('Vui lòng yêu cầu gửi mã xác nhận đến Gmail trước khi đăng ký');
    }
    if (Date.now() > stored.expiresAt) {
      this.verificationCodes.delete(normalizedEmail);
      throw new BadRequestException('Mã xác minh đã hết hạn, vui lòng gửi lại mã mới');
    }
    if (stored.code !== RegisterDto.MaXacThuc?.trim()) {
      throw new BadRequestException('Mã xác minh không chính xác');
    }

    // Xác minh thành công -> xóa mã OTP đã dùng
    this.verificationCodes.delete(normalizedEmail);

    const passHash = await bcrypt.hash(RegisterDto.MatKhau, 10);
    const newUser = this.userRes.create({
      Gmail: normalizedEmail,
      TaiKhoan: taiKhoan,
      MatKhau: passHash,
      TenDayDu: RegisterDto.TenDayDu?.trim(),
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
        SDT: typeof data.SDT === 'string' ? data.SDT.trim() : data.SDT,
        Avatar: data.Avatar,
      }).filter(([, value]) => value !== undefined),
    );

    await this.userRes.update(
      { TaiKhoan },
      { ...allowedData, DaHoanThienHoSo: true },
    );

    const updatedUser = await this.userRes.findOne({ where: { TaiKhoan } });
    let access_token: string | undefined;
    if (updatedUser) {
      const payload = {
        TaiKhoan: updatedUser.TaiKhoan,
        TenDayDu: updatedUser.TenDayDu,
        VaiTro: updatedUser.VaiTro,
        SDT: updatedUser.SDT,
        Gmail: updatedUser.Gmail,
        DaHoanThienHoSo: true,
      };
      access_token = await this.jwtService.signAsync(payload);
    }

    return {
      message: 'Cập nhật thành công',
      access_token,
    };
  }

  private deleteAvatarFile(avatarPath?: string) {
    if (!avatarPath || !avatarPath.startsWith('/private-uploads/avatars/')) return;

    const fileName = avatarPath.replace('/private-uploads/avatars/', '');
    if (!fileName) return;

    const targetPath = join(AVATAR_UPLOAD_DIR, fileName);
    if (existsSync(targetPath)) {
      try {
        unlinkSync(targetPath);
      } catch {
        // Bỏ qua lỗi nếu không thể xóa file
      }
    }
  }

  async uploadAvatar(TaiKhoan: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để tải lên');
    }

    const currentUser = await this.userRes.findOne({ where: { TaiKhoan } });
    if (!currentUser) throw new NotFoundException('Không tìm thấy tài khoản');

    // Xóa file avatar cũ nếu tồn tại trên ổ đĩa
    this.deleteAvatarFile(currentUser.Avatar);

    const avatarPath = `/private-uploads/avatars/${file.filename}`;
    await this.userRes.update({ TaiKhoan }, { Avatar: avatarPath });

    return {
      message: 'Cập nhật ảnh đại diện thành công',
      avatarUrl: avatarPath,
    };
  }

  async removeAvatar(TaiKhoan: string) {
    const currentUser = await this.userRes.findOne({ where: { TaiKhoan } });
    if (!currentUser) throw new NotFoundException('Không tìm thấy tài khoản');

    this.deleteAvatarFile(currentUser.Avatar);

    await this.userRes.update({ TaiKhoan }, { Avatar: null as any });
    return { message: 'Đã xóa ảnh đại diện' };
  }

  async getProfile(TaiKhoan: string) {
    const user = await this.userRes.findOne({
      where: { TaiKhoan: TaiKhoan },
      select: ['TaiKhoan', 'TenDayDu', 'SDT', 'Gmail', 'VaiTro', 'DaHoanThienHoSo', 'Avatar'],
    });

    return user;
  }
}
