import { ApiProperty } from "@nestjs/swagger";

export class AddTaiLieuDto {

    @ApiProperty()
    MaDT?: string;

    @ApiProperty()
    MaMoc?: number;

    @ApiProperty()
    NguoiGui: string;

    @ApiProperty()
    LoaiTaiLieu?: string;
}