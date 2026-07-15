import { ApiProperty } from '@nestjs/swagger';

export class UpdateMocDeTaiDto {
  @ApiProperty()
  TenMoc?: string;

  @ApiProperty()
  MoTa?: string;

  @ApiProperty()
  ThuTu?: number;

  @ApiProperty()
  TrongSo?: number;

  @ApiProperty()
  GhiChu?: string;

  @ApiProperty()
  TrangThai?: string;

  @ApiProperty()
  NgayBatDau?: Date;

  @ApiProperty()
  NgayKetThuc?: Date;

  @ApiProperty({ required: false, type: [Number] })
  ThanhVienIds?: number[];
}
