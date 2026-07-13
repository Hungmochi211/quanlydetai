import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { taiLieuMulterOptions } from './multer.config';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('documents')
@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class DocumentsController {
    constructor(private readonly TLService: DocumentsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', taiLieuMulterOptions))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() dto: AddTaiLieuDto,) {
        if (!file) {
            throw new BadRequestException("Chưa có file nào được upload");
        }

        const taiLieu = await this.TLService.upload(dto, file);
        return {
            message: 'Upload tài liệu thành công',
            data: taiLieu,
        };
    }

    @Get(':id/download')
    async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const { path, tenFile } = await this.TLService.getPhysicalPath(id);
        return res.download(path, tenFile);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.TLService.findOne(id);
    }

    @Get('detai/:maDT')
    findByDeTai(@Param('MaDT') maDT: string) {
        return this.TLService.findByDeTai(maDT);
    }

    @Get('moc/:maMoc')
    findByMoc(@Param('MaMoc', ParseIntPipe) maMoc: number) {
        return this.TLService.findByMoc(maMoc);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.TLService.remove(id);
    }
}
