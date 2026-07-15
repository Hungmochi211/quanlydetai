import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddTaiLieuDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  MaDT: string;

  @ApiProperty()
  @IsOptional()
  MaMoc?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  LoaiTaiLieu?: string;
}
