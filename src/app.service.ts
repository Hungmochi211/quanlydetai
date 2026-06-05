import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello Hùng Mochi!';
  }

  getHello2(): string {
    return 'Đẳng cấp';
  }
}
