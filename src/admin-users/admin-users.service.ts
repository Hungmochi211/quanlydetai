import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateUserDto,
  AdminUsersQueryDto,
} from 'src/dto/AdminUserDto';
import { NguoiDung } from 'src/entity/user.entity';

const SAFE_USER_FIELDS = [
  'TaiKhoan',
  'TenDayDu',
  'Gmail',
  'SDT',
  'VaiTro',
  'DaHoanThienHoSo',
] as const;

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
  ) {}

  async findAll(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const builder = this.userRepository
      .createQueryBuilder('user')
      .select(SAFE_USER_FIELDS.map((field) => `user.${field}`))
      .orderBy('user.TaiKhoan', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.keyword?.trim()) {
      builder.andWhere(
        '(user.TaiKhoan LIKE :keyword OR user.TenDayDu LIKE :keyword OR user.Gmail LIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }
    if (query.role) builder.andWhere('user.VaiTro = :role', { role: query.role });
    const [data, total] = await builder.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(taiKhoan: string) {
    const user = await this.userRepository.findOne({
      where: { TaiKhoan: taiKhoan },
      select: [...SAFE_USER_FIELDS],
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async create(data: AdminCreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { TaiKhoan: data.TaiKhoan },
    });
    if (existing) throw new BadRequestException('Tài khoản đã tồn tại');

    const user = this.userRepository.create({
      TaiKhoan: data.TaiKhoan.trim(),
      MatKhau: await bcrypt.hash(data.MatKhau, 10),
      VaiTro: data.VaiTro,
      DaHoanThienHoSo: false,
    });
    await this.userRepository.save(user);
    return this.findOne(user.TaiKhoan);
  }

  async update(taiKhoan: string, data: AdminUpdateUserDto, currentAdmin: string) {
    await this.ensureNotRemovingOwnAdminRole(taiKhoan, data.VaiTro, currentAdmin);
    await this.findOne(taiKhoan);
    const updateData = Object.fromEntries(
      Object.entries({
        Gmail: data.Gmail?.trim(),
        TenDayDu: data.TenDayDu?.trim(),
        VaiTro: data.VaiTro,
        SDT: data.SDT,
      }).filter(([, value]) => value !== undefined),
    );
    await this.userRepository.update({ TaiKhoan: taiKhoan }, updateData);
    return this.findOne(taiKhoan);
  }

  async resetPassword(
    taiKhoan: string,
    data: AdminResetPasswordDto,
  ) {
    await this.findOne(taiKhoan);
    await this.userRepository.update(
      { TaiKhoan: taiKhoan },
      {
        MatKhau: await bcrypt.hash(data.MatKhau, 10),
        ResetToken: null as any,
        ResetTokenExpire: null as any,
      },
    );
    return { message: 'Đã đặt lại mật khẩu tài khoản' };
  }

  private async ensureNotRemovingOwnAdminRole(
    taiKhoan: string,
    nextRole: string | undefined,
    currentAdmin: string,
  ) {
    if (taiKhoan === currentAdmin && nextRole && nextRole !== 'Admin') {
      throw new BadRequestException('Không thể tự bỏ quyền Admin của chính mình');
    }
  }
}
