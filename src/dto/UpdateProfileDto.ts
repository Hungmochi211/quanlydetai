import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Các trường người dùng được phép tự cập nhật. */
export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  TenDayDu?: string;

  @ApiProperty({ required: false, example: 'student@vnua.edu.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100)
  Gmail?: string;

  @ApiProperty({ required: false, example: '0912345678' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Số điện thoại không hợp lệ' })
  SDT?: string;

  @ApiProperty({ required: false, example: '/private-uploads/avatars/user-123.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  Avatar?: string;
}
