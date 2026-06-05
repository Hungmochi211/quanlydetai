import { Injectable,forwardRef,Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationDto } from '../dto/notificationDto';
import { InjectRepository } from '@nestjs/typeorm';
import { ThongBao } from 'src/entity/notification.entity';
import { In, Repository } from 'typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import { error } from 'console';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(ThongBao)
    private TBRes: Repository<ThongBao>,

    @InjectRepository(NguoiDung)
    private userRes: Repository<NguoiDung>,
  ) { }

  async create(user: any,createNotificationDto: NotificationDto) {

    //kiem tra
    const sender = await this.userRes.findOne({
      where: { TaiKhoan: user.TaiKhoan }
    });

    const render = await this.userRes.findOne({
      where: { TaiKhoan: createNotificationDto.TkNguoiNhan }
    });

    if(!render || !sender) {
      throw new error("Tài khoản không tồn tại")
    }

    //luu giu lieu vao database
    const notifi = this.TBRes.create({
      TaiKhoan: user.TaiKhoan,
      TkNguoiNhan: createNotificationDto.TkNguoiNhan,
      TieuDe: createNotificationDto.TieuDe,
      NoiDung: createNotificationDto.NoiDung,
      NgayTao: new Date()
    });

    const saveNoti = await this.TBRes.save(notifi);
    return saveNoti;
  }

  async getNotification(taikhoan: string){
    const reslut  = this.TBRes.find({
      where: {
        TkNguoiNhan: taikhoan,
      },
      order: {
        idThongBao: "DESC",
      }
    })

    return reslut;
  }

  async changeState(id: number,user: any){
    const changeNoti = await  this.TBRes.findOne({
      where: {idThongBao: id}
    });

    if(!changeNoti){
      throw new NotFoundException("Không tìm thấy thông báo này")
    }
    changeNoti!.TrangThai = true;
    return this.TBRes.save(changeNoti);
  }

  update(id: number, updateNotificationDto: NotificationDto) {
    return `This action updates a #${id} notification`;
  }

  async removeNotification(id: number) {
    const notifi = await this.TBRes.findOne({
      where: {idThongBao: id}
    });

    if(!notifi) {
      throw new NotFoundException("không tìm thấy thông báo!")
    }

    return this.TBRes.delete(notifi);
  }

  async removeNotifications(ids: Number[]) {
    await this.TBRes.delete({
      idThongBao: In(ids)
    });
  }
}
