import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const SYSTEM_ROLES = [
  'Sinh viên',
  'Giảng viên',
  'Người hướng dẫn',
  'Trợ lý khoa học',
  'Ban KH&CN',
  'Tài chính',
  'Admin',
  // Tạm tương thích với luồng xét duyệt hiện tại; sau này chuyển sang thành viên hội đồng.
  'Hội đồng xét duyệt',
  'Hội đồng chấm điểm',
] as const;

export class AdminCreateUserDto {
  @ApiProperty({ example: 'gv01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  TaiKhoan!: string;

  @ApiProperty({ example: 'MatKhau123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  MatKhau!: string;

  @ApiProperty({ enum: SYSTEM_ROLES, example: 'Giảng viên' })
  @IsIn(SYSTEM_ROLES, { message: 'Vai trò không hợp lệ' })
  VaiTro!: (typeof SYSTEM_ROLES)[number];
}

export class AdminUpdateUserDto {
  @ApiProperty({ required: false, example: 'giangvien@vnua.edu.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100)
  Gmail?: string;

  @ApiProperty({ required: false, example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  TenDayDu?: string;

  @ApiProperty({ required: false, enum: SYSTEM_ROLES, example: 'Giảng viên' })
  @IsOptional()
  @IsIn(SYSTEM_ROLES, { message: 'Vai trò không hợp lệ' })
  VaiTro?: (typeof SYSTEM_ROLES)[number];

  @ApiProperty({ required: false, example: 912345678 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  SDT?: number;
}

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'MatKhauMoi123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  MatKhau!: string;
}

export class AdminUsersQueryDto {
  @ApiProperty({ required: false, example: 'nguyen' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, enum: SYSTEM_ROLES, example: 'Giảng viên' })
  @IsOptional()
  @IsIn(SYSTEM_ROLES, { message: 'Vai trò không hợp lệ' })
  role?: (typeof SYSTEM_ROLES)[number];

  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
