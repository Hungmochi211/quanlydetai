import { BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let users: any[];
  let repository: any;

  beforeEach(() => {
    users = [
      {
        TaiKhoan: 'admin01',
        TenDayDu: 'Quản trị viên',
        Gmail: 'admin@example.com',
        VaiTro: 'Admin',
        MatKhau: 'hashed-admin',
      },
    ];
    repository = {
      findOne: jest.fn(async ({ where }: any) =>
        users.find((user) => user.TaiKhoan === where.TaiKhoan) ?? null,
      ),
      create: jest.fn((data) => data),
      save: jest.fn(async (user) => {
        users.push(user);
        return user;
      }),
      update: jest.fn(async ({ TaiKhoan }, data) => {
        const user = users.find((item) => item.TaiKhoan === TaiKhoan);
        if (user) Object.assign(user, data);
        return { affected: user ? 1 : 0 };
      }),
    };
    service = new AdminUsersService(repository);
  });

  it('tạo tài khoản cán bộ, băm mật khẩu và giữ role do Admin cấp', async () => {
    const result = await service.create({
      TaiKhoan: 'lecturer01',
      MatKhau: 'Secret123',
      VaiTro: 'Giảng viên',
    });

    expect(result).toMatchObject({
      TaiKhoan: 'lecturer01',
      VaiTro: 'Giảng viên',
    });
    expect(await bcrypt.compare('Secret123', users[1].MatKhau)).toBe(true);
  });

  it('không tạo trùng tài khoản', async () => {
    await expect(service.create({
      TaiKhoan: 'admin01',
      MatKhau: 'Secret123',
      VaiTro: 'Giảng viên',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('không cho Admin đang đăng nhập tự bỏ quyền Admin', async () => {
    await expect(service.update('admin01', { VaiTro: 'Giảng viên' }, 'admin01'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('Admin đặt lại mật khẩu thì token khôi phục cũ bị xóa', async () => {
    users[0].ResetToken = 'old-token';
    users[0].ResetTokenExpire = new Date();

    await expect(service.resetPassword('admin01', { MatKhau: 'NewSecret123' }))
      .resolves.toEqual({ message: 'Đã đặt lại mật khẩu tài khoản' });

    expect(await bcrypt.compare('NewSecret123', users[0].MatKhau)).toBe(true);
    expect(users[0]).toMatchObject({ ResetToken: null, ResetTokenExpire: null });
  });
});
