import { IsDateString, IsOptional } from 'class-validator';

export class DateDto {
  @IsOptional()
  @IsDateString()
  NgayBatDau?: string;

  @IsOptional()
  @IsDateString()
  NgayKetThuc?: string;

  @IsOptional()
  @IsDateString()
  NgayXetDuyet?: string;
}