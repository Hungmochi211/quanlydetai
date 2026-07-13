import { ApiProperty } from '@nestjs/swagger';

export class CreateMocDeTaiDto {
  @ApiProperty()
  MaDT: string;

  @ApiProperty()
  TenMoc: string;

  @ApiProperty()
  MoTa?: string;

  @ApiProperty()
  ThuTu: number;

  @ApiProperty()
  TrongSo: number;

  @ApiProperty()
  GhiChu?: string;

  @ApiProperty()
  TrangThai: string;

  @ApiProperty()
  NgayBatDau: Date;

  @ApiProperty()
  NgayKetThuc: Date;

  @ApiProperty()
  ThanhVienIds!: number[];
}
