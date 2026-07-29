import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAcceptanceDossierDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() GhiChu?: string;
}
export class UpdateAcceptanceDossierDto extends CreateAcceptanceDossierDto {}
export class SubmitAcceptanceScoreDto {
  @ApiProperty({ minimum: 0, maximum: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  Diem!: number;
  @ApiProperty() @IsString() @IsNotEmpty() NhanXet!: string;
}
export class FinalizeAcceptanceDto {
  @ApiProperty({ required: false, minimum: 0, maximum: 10, description: 'Mặc định bằng điểm trung bình hội đồng; Chủ tịch có thể điều chỉnh trước khi chốt' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  DiemCuoiCung?: number;

  @ApiProperty({ example: 'Tốt' }) @IsString() @IsNotEmpty() ChatLuong!: string;
  @ApiProperty({ enum: ['Đạt', 'Yêu cầu bổ sung', 'Không đạt'] })
  @IsIn(['Đạt', 'Yêu cầu bổ sung', 'Không đạt'])
  KetQua!: 'Đạt' | 'Yêu cầu bổ sung' | 'Không đạt';
  @ApiProperty() @IsString() @IsNotEmpty() NhanXetChuTich!: string;
}
