import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Tài liệu được tải qua API có kiểm tra quyền, không phục vụ trực tiếp như file tĩnh.
const uploadPath = './private-uploads/documents';
if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.doc',
  '.docx',
  '.xlsx',
  '.pptx',
]);

export const taiLieuMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: uploadPath,
    //auth tên file
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      return callback(
        new BadRequestException('Định dạng file không được hỗ trợ'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};
