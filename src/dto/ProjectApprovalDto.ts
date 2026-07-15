import { ApiProperty } from '@nestjs/swagger';

export class SubmitProjectForApprovalDto {
  @ApiProperty({ type: [String], example: ['hoidong01', 'hoidong02'] })
  reviewerIds!: string[];

  @ApiProperty({ required: false })
  note?: string;
}

export class ReviewProjectDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  decision!: 'approved' | 'rejected';

  @ApiProperty({ required: false })
  note?: string;
}
