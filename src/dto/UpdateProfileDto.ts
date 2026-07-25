import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @ApiProperty({ required: false, example: 912345678 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số điện thoại không hợp lệ' })
  SDT?: number;
}
