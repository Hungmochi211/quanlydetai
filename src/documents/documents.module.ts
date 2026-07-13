import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaiLieu } from 'src/entity/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaiLieu])],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule {}
