import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export const COUNCIL_POSITIONS = ['Chủ tịch', 'Thư ký', 'Ủy viên', 'Phản biện'] as const;
export const COUNCIL_BUSINESSES = ['approval', 'scoring', 'monitoring', 'liquidation', 'other'] as const;

export class CreateCouncilTypeDto {
  @ApiProperty({ example: 'Hội đồng tuyển chọn cấp khoa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  TenLoaiHoiDong!: string;

  @ApiProperty({ required: false, enum: COUNCIL_BUSINESSES, example: 'other' })
  @IsOptional()
  @IsIn(COUNCIL_BUSINESSES, { message: 'Nghiệp vụ hội đồng không hợp lệ' })
  NghiepVu?: (typeof COUNCIL_BUSINESSES)[number];

  @ApiProperty({ required: false, example: 'Chọn đề tài vào vòng tiếp theo' })
  @IsOptional()
  @IsString()
  MoTa?: string;
}

export class UpdateCouncilTypeDto {
  @ApiProperty({ required: false, example: 'Hội đồng tuyển chọn cấp khoa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  TenLoaiHoiDong?: string;

  @ApiProperty({ required: false, enum: COUNCIL_BUSINESSES, example: 'other' })
  @IsOptional()
  @IsIn(COUNCIL_BUSINESSES, { message: 'Nghiệp vụ hội đồng không hợp lệ' })
  NghiepVu?: (typeof COUNCIL_BUSINESSES)[number];

  @ApiProperty({ required: false, example: 'Mô tả đã cập nhật' })
  @IsOptional()
  @IsString()
  MoTa?: string;
}

export class CreateCouncilDto {
  @ApiProperty({ example: 'Hội đồng xét duyệt CNTT đợt 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  TenHoiDong!: string;

  @ApiProperty({ example: 1, description: 'Mã loại hội đồng trong danh mục LoaiHoiDong' })
  @Type(() => Number)
  @IsInt()
  MaLoaiHoiDong!: number;

  @ApiProperty({ required: false, example: 'Xét duyệt đề tài sinh viên tháng 9' })
  @IsOptional()
  @IsString()
  MoTa?: string;

  @ApiProperty({ required: false, example: false, description: 'Tự động gán cho đề tài khi đi vào luồng nghiệp vụ tương ứng' })
  @IsOptional()
  @IsBoolean()
  LaHoiDongMacDinh?: boolean;
}

export class UpdateCouncilDto {
  @ApiProperty({ required: false, example: 'Hội đồng xét duyệt CNTT đợt 2' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  TenHoiDong?: string;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  MaLoaiHoiDong?: number;

  @ApiProperty({ required: false, example: 'Mô tả đã cập nhật' })
  @IsOptional()
  @IsString()
  MoTa?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  LaHoiDongMacDinh?: boolean;
}

export class AddCouncilMemberDto {
  @ApiProperty({ example: 'gv01' })
  @IsString()
  @IsNotEmpty()
  TaiKhoan!: string;

  @ApiProperty({ required: false, enum: COUNCIL_POSITIONS, example: 'Ủy viên' })
  @IsOptional()
  @IsIn(COUNCIL_POSITIONS, { message: 'Chức danh không hợp lệ' })
  ChucDanh?: (typeof COUNCIL_POSITIONS)[number];
}

export class AssignCouncilToProjectDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  MaHoiDong!: number;
}
