import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectCommentDto {
  @ApiProperty()
  NoiDung!: string;
}

export class UpdateProjectCommentDto {
  @ApiProperty()
  NoiDung!: string;
}
