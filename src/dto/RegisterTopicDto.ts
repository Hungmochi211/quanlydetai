import { ApiProperty } from "@nestjs/swagger";

export class RegisterTopicDto {
    @ApiProperty()
    MaDT!: string;

    @ApiProperty()
    TenDT!: string;

    @ApiProperty()
    Khoa!: string;

    @ApiProperty()
    ChuyenNganh!: string;

    @ApiProperty()
    PhanLoai!: string;

    @ApiProperty()
    idNguoiHD!: string;

    @ApiProperty()
    MoTa!: string;

    @ApiProperty()
    ThanhVienIds!: string[];
}