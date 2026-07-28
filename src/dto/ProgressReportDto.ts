import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PROGRESS_REPORT_DECISIONS = ['accepted', 'supplement', 'rejected'] as const;
export const PROGRESS_REPORT_TYPES = ['Theo mốc', 'Định kỳ', 'Đột xuất'] as const;

export class CreateProgressReportDto {
  @ApiProperty({ enum: PROGRESS_REPORT_TYPES, example: 'Theo mốc' })
  @IsIn(PROGRESS_REPORT_TYPES)
  LoaiBaoCao!: (typeof PROGRESS_REPORT_TYPES)[number];

  @ApiProperty({ required: false, example: 12, description: 'Bắt buộc khi chọn báo cáo Theo mốc' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  MaMoc?: number;

  @ApiProperty({ required: false, example: 'Báo cáo tháng 08/2026', description: 'Bắt buộc khi chọn Định kỳ hoặc Đột xuất' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  KyBaoCao?: string;

  @ApiProperty({ example: 'Đã hoàn thành khảo sát, đang triển khai chức năng chính.' })
  @IsString()
  @IsNotEmpty()
  NoiDungBaoCao!: string;

  @ApiProperty({ required: false, example: 35, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  TienDoBaoCao?: number;

  @ApiProperty({ required: false, example: 'Cần thêm thời gian thu thập dữ liệu.' })
  @IsOptional()
  @IsString()
  KhoKhan?: string;

  @ApiProperty({ required: false, example: 'Đề nghị hội đồng góp ý về phạm vi dữ liệu.' })
  @IsOptional()
  @IsString()
  DeXuat?: string;
}

export class UpdateProgressReportDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  NoiDungBaoCao?: string;

  @ApiProperty({ required: false, example: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  TienDoBaoCao?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  KhoKhan?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  DeXuat?: string;
}

export class ReviewProgressReportDto {
  @ApiProperty({ enum: PROGRESS_REPORT_DECISIONS, example: 'supplement' })
  @IsIn(PROGRESS_REPORT_DECISIONS, { message: 'Quyết định phản hồi không hợp lệ' })
  decision!: (typeof PROGRESS_REPORT_DECISIONS)[number];

  @ApiProperty({ example: 'Vui lòng bổ sung minh chứng khảo sát và kế hoạch tháng tới.' })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
