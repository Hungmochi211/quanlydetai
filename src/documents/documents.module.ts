import { forwardRef, Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaiLieu, ThanhVienDT, MocDeTai])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService]
})
export class DocumentsModule { }
