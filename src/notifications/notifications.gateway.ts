import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { NotificationsService } from './notifications.service';
import { NotificationDto} from '../dto/notificationDto';
import { Server, Socket } from 'socket.io';
import { Post,Controller } from '@nestjs/common';

@Controller('notifi')
@WebSocketGateway({ namespace: 'notifications', cors: { orgin: '*' } }) 
export class NotificationsGateway {

  @WebSocketServer()
  server!: Server;

  //kiem tra user dang nhap
  handleConnection(client: Socket) {
    console.log("Người dùng đã kết nối", client.id);
  }

  handleDisconnect(client: Socket) {
    console.log("Người dùng đã ngắt kết nối", client.id);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() TaiKhoan: string, @ConnectedSocket() client: Socket) {
    client.join(TaiKhoan);
  }

  //Gui thong bao
  sendNotification(TaiKhoan: string, NoiDung: any) {
    this.server.to(TaiKhoan).emit(`Thông báo tới ${TaiKhoan}`, NoiDung);
  }

}
