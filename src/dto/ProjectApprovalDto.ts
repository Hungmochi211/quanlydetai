import { ApiProperty } from '@nestjs/swagger';

export class SubmitProjectForApprovalDto {
  @ApiProperty({ enum: ['approval', 'scoring'], description: 'Loại hội đồng nhận đề tài' })
  councilType!: 'approval' | 'scoring';

  @ApiProperty({ required: false, description: 'Ghi chú gửi hội đồng' })
  note?: string;
}

export class ReviewProjectDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  decision!: 'approved' | 'rejected';

  @ApiProperty({ required: false })
  note?: string;
}
