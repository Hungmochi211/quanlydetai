import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    TaiKhoan: 'student01',
    TenDayDu: 'Nguyễn Văn A',
    VaiTro: 'Sinh viên',
    SDT: 123456789,
    Gmail: 'student01@example.com',
    MatKhau: '',
  };

  const userService = { findOne: jest.fn() };
  const jwtService = { signAsync: jest.fn(), sign: jest.fn(), verify: jest.fn() };
  const configService = { getOrThrow: jest.fn() };
  const userRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    user.MatKhau = await bcrypt.hash('CorrectPassword1!', 4);
    userService.findOne.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('access-token');
    service = new AuthService(userService as any, jwtService as any, configService as any, userRepository as any);
  });

  it('trả JWT khi thông tin đăng nhập hợp lệ', async () => {
    await expect(service.signIn('student01', 'CorrectPassword1!')).resolves.toEqual({
      access_token: 'access-token',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ TaiKhoan: 'student01', VaiTro: 'Sinh viên' }),
    );
  });

  it('từ chối khi mật khẩu không đúng', async () => {
    await expect(service.signIn('student01', 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
