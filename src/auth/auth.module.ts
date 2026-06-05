import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthCotroller } from "./auth.controller";
import { UserModule } from "src/user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { jwtConstants } from "./constants";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NguoiDung } from "src/entity/user.entity";
import { AuthGuard } from "./auth.guard";

@Module({
    imports: [
        TypeOrmModule.forFeature([NguoiDung]),
        UserModule,
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: {expiresIn: '3600s',}
        }),
    ],
    providers: [AuthService,AuthGuard],
    controllers: [AuthCotroller],
    exports: [AuthService,JwtModule],
})

export class AuthModule {}