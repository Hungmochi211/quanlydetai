import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  Gmail!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  TaiKhoan!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  MatKhau!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  TenDayDu!: string;

  @ApiProperty({ description: 'Mã xác minh 6 chữ số gửi về Gmail' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mã xác minh' })
  @MinLength(6, { message: 'Mã xác minh phải có 6 chữ số' })
  @MaxLength(6, { message: 'Mã xác minh phải có 6 chữ số' })
  MaXacThuc!: string;
}
