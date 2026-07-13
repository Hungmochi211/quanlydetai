import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  Gmail!: string;

  @ApiProperty()
  TaiKhoan!: string;

  @ApiProperty()
  MatKhau!: string;
}
