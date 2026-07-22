import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SpecModule } from './spec/spec.module';
import { ProjectModule } from './project/project.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { NhanXetDeTai } from './entity/project-comment.entity';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    SpecModule,
    ProjectModule,
    NotificationsModule,
    ProgressModule,
    DocumentsModule,
    CommentsModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT') ?? 1433),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),
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
          NhanXetDeTai,
        ],
        synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        options: {
          encrypt: config.get<string>('DB_ENCRYPT') === 'true',
          trustServerCertificate:
            config.get<string>('DB_TRUST_SERVER_CERTIFICATE') === 'true',
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
