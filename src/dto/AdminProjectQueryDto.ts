import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminProjectQueryDto {
  @ApiProperty({ required: false, example: 'chatbot' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, example: 'NCKH' })
  @IsOptional()
  @IsString()
  phanLoai?: string;

  @ApiProperty({ required: false, example: 'Bắt đầu' })
  @IsOptional()
  @IsString()
  trangThai?: string;

  @ApiProperty({ required: false, example: 'Khoa CNTT' })
  @IsOptional()
  @IsString()
  khoa?: string;

  @ApiProperty({ required: false, example: '2025-2026' })
  @IsOptional()
  @IsString()
  namHoc?: string;

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
