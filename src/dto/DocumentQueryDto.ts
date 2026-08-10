import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên file hoặc loại tài liệu' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  keyword?: string;

  @ApiPropertyOptional({ description: 'Lọc theo loại/nguồn tài liệu' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;
}
