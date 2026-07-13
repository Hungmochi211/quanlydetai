import { ApiProperty } from "@nestjs/swagger";


export class NotificationDto {

  @ApiProperty()
  TkNguoiNhan!: string

  @ApiProperty()
  TieuDe!: string

  @ApiProperty()
  NoiDung!: string

  @ApiProperty()
  NgayTao!: Date
}
