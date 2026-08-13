import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export const ADJUSTMENT_GROUPS = [
  'Nội dung nghiên cứu',
  'Tiến độ / mốc thực hiện',
  'Kinh phí',
  'Thành viên thực hiện',
] as const;

export class CreateAdjustmentRequestDto {
  @ApiProperty({ enum: ADJUSTMENT_GROUPS, isArray: true, example: ['Tiến độ / mốc thực hiện'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  NhomDieuChinh!: string[];

  @ApiProperty({ example: 'Mốc khảo sát dự kiến hoàn thành trước ngày 30/08/2026.' })
  @IsString()
  @IsNotEmpty()
  ThongTinHienTai!: string;

  @ApiProperty({ example: 'Đề nghị gia hạn mốc khảo sát đến ngày 15/09/2026.' })
  @IsString()
  @IsNotEmpty()
  NoiDungDeNghi!: string;

  @ApiProperty({ example: 'Cần thêm thời gian thu thập dữ liệu thực tế.' })
  @IsString()
  @IsNotEmpty()
  LyDo!: string;
}

export class AdminReviewAdjustmentRequestDto {
  @ApiProperty({ enum: ['accepted', 'rejected'], example: 'accepted' })
  @IsIn(['accepted', 'rejected'])
  decision!: 'accepted' | 'rejected';

  @ApiProperty({ required: false, example: 'Cần bổ sung kế hoạch tiến độ chi tiết.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApplyAdjustmentMilestoneDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  MaMoc!: number;

  @ApiProperty({ example: '2026-09-15' })
  @IsString()
  NgayKetThuc!: string;
}

export class ApplyAdjustmentMemberDto {
  @ApiProperty({ example: 'sv001' })
  @IsString()
  TaiKhoan!: string;

  @ApiProperty({ example: 'Thành viên' })
  @IsString()
  VaiTroDT!: string;
}

export class ApplyAdjustmentRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  ThongTinDeTai?: {
    TenDT?: string;
    ChuyenNganh?: string;
    Khoa?: string;
    PhanLoai?: string;
    MoTa?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  MoTa?: string;

  @ApiProperty({ required: false, type: [ApplyAdjustmentMilestoneDto] })
  @IsOptional()
  @IsArray()
  Milestones?: ApplyAdjustmentMilestoneDto[];

  @ApiProperty({ required: false, type: [ApplyAdjustmentMemberDto] })
  @IsOptional()
  @IsArray()
  ThanhVien?: ApplyAdjustmentMemberDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  GhiChuApDung?: string;
}

export class AdjustmentRequestQueryDto {
  @ApiProperty({ required: false, enum: ['Chờ duyệt', 'Đã chấp nhận', 'Từ chối'] })
  @IsOptional()
  @IsIn(['Chờ duyệt', 'Đã chấp nhận', 'Từ chối'])
  status?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
