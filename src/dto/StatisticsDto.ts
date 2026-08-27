import { IsIn, IsOptional, IsString } from 'class-validator';

export class StatisticsQueryDto {
  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class StatisticsExportQueryDto extends StatisticsQueryDto {
  @IsIn(['excel', 'pdf', 'docx'])
  format!: 'excel' | 'pdf' | 'docx';
}
