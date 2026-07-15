import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SpecModule } from './spec/spec.module';
import { ProjectModule } from './project/project.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NguoiDung } from 'src/entity/user.entity';
import { PhanLoai } from 'src/entity/speclist.entity';
import { ChuyenNganh } from 'src/entity/spec.entity';
import { NguoiHD } from 'src/entity/teacher.entity';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { ThongBao } from 'src/entity/notification.entity';
import { ProgressModule } from './progress/progress.module';
import { MocDeTai } from './entity/progress.entity';
import { DocumentsModule } from './documents/documents.module';
import { TaiLieu } from './entity/document.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { ThanhVienMocDT } from './entity/pgmem.entity';
import { XetDuyetDeTai } from './entity/project-approval.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    SpecModule,
    ProjectModule,
    NotificationsModule,
    ProgressModule,
    DocumentsModule,
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'localhost',
      port: 1433,
      username: 'hungmochi211',
      password: 'Hung',
      database: 'QuanLyDeTai',
      entities: [
        NguoiDung,
        ChuyenNganh,
        PhanLoai,
        NguoiHD,
        DeTai,
        ThanhVienDT,
        ThongBao,
        MocDeTai,
        TaiLieu,
        ThanhVienMocDT,
        XetDuyetDeTai,
      ],
      synchronize: false,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
