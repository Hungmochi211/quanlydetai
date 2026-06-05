import { Injectable,NotFoundException,UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import * as bcrypt from 'bcrypt'
import { error } from 'console';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(NguoiDung)
        private userRes: Repository<NguoiDung>,
    ) { }

    async Login(TaiKhoan: string, MatKhau: string) {

        //Check tai khoan
        const username = await this.userRes.findOne({ where: { TaiKhoan } });
        if (!username) throw new UnauthorizedException('Tài khoản không tồn tại');

        //Check mat khau
        const hashpassword = await bcrypt.hash(username.MatKhau, 10);
        const userpassword = await bcrypt.compare(MatKhau, hashpassword);
        if (!userpassword) throw new UnauthorizedException('Mật khẩu không chính xác');

        return { username: { TaiKhoan: username.TaiKhoan, MatKhau: username.MatKhau } }
    }

    async findOne(username: string): Promise<NguoiDung | null> {
        return this.userRes.findOne({ where: { TaiKhoan: username } });
    }

    async checkTaiKhoan(userkey:string){
        if(!userkey) return [];

        const userfind = await this.userRes.find({
            where: {TaiKhoan: Like(`%${userkey}%`)},
            select: ["TenDayDu","TaiKhoan"],
            take: 10,
        })

        return userfind;
    }

    async findUserByTk(Tk: string){
        const usercheck = await this.userRes.findOne({
            where: {TaiKhoan: Tk},
            select: ['TaiKhoan','TenDayDu','Gmail','SDT']
        });

        if(!usercheck) throw new NotFoundException("Không tìm thấy tài khoản này");
        return usercheck;
    }

    async findUserByRole(role: string){
        const rolecheck = await this.userRes.find({
            where: {VaiTro: role},
            select: ["TaiKhoan",'TenDayDu']
        });

        if(!rolecheck || rolecheck.length === 0) throw new NotFoundException("Không có người dùng nào có vai trò này");
        return rolecheck.map(user=>({
            value: user.TaiKhoan,
            label: user.TenDayDu
        }));
    }
}