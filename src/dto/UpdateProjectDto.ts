import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional()
  TenDT?: string;

  @ApiPropertyOptional()
  ChuyenNganh?: string;

  @ApiPropertyOptional()
  Khoa?: string;

  @ApiPropertyOptional()
  PhanLoai?: string;

  @ApiPropertyOptional()
  idNguoiHD?: string;

  @ApiPropertyOptional()
  MoTa?: string;

}
