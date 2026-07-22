import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Request, Res, UploadedFile, UseGuards, UseInterceptors, } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { DocumentsService } from './documents.service';
import { taiLieuMulterOptions } from './multer.config';

interface AuthenticatedRequest {
    user?: {
        TaiKhoan?: string;
    };
}

@Controller('documents')
@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file', taiLieuMulterOptions))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: AddTaiLieuDto,
        @Request() req: AuthenticatedRequest,
    ) {
        if (!file) {
            throw new BadRequestException('Chưa có file nào được upload');
        }

        const taiLieu = await this.documentsService.upload(
            dto,
            file,
            this.getTaiKhoan(req),
        );
        return { message: 'Upload tài liệu thành công', data: taiLieu };
    }

    @Get('detai/:maDT')
    findByDeTai(
        @Param('maDT') maDT: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.documentsService.findByDeTai(maDT, this.getTaiKhoan(req));
    }

    @Get('moc/:maMoc')
    findByMoc(
        @Param('maMoc', ParseIntPipe) maMoc: number,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.documentsService.findByMoc(maMoc, this.getTaiKhoan(req));
    }

    @Get(':id/download')
    async download(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const { path, tenFile } = await this.documentsService.getPhysicalPath(
            id,
            this.getTaiKhoan(req),
        );
        return res.download(path, tenFile);
    }

    @Get(':id/preview')
    async preview(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: AuthenticatedRequest,
        @Res() res: Response,
    ) {
        const { path, tenFile } = await this.documentsService.getPhysicalPath(
            id,
            this.getTaiKhoan(req),
        );
        res.setHeader(
            'Content-Disposition',
            `inline; filename*=UTF-8''${encodeURIComponent(tenFile)}`,
        );
        return res.sendFile(path);
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.documentsService.findOne(id, this.getTaiKhoan(req));
    }

    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.documentsService.remove(id, this.getTaiKhoan(req));
    }

    private getTaiKhoan(req: AuthenticatedRequest): string {
        const taiKhoan = req.user?.TaiKhoan;
        if (!taiKhoan) {
            throw new BadRequestException('Không xác định được tài khoản đăng nhập');
        }
        return taiKhoan;
    }
}
