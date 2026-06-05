import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {

    @ApiProperty()
    TaiKhoan!: string;

    @ApiProperty()
    MatKhau!: string;
}