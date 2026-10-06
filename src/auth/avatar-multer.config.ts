import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const AVATAR_UPLOAD_DIR = join(process.cwd(), 'private-uploads', 'avatars');
if (!existsSync(AVATAR_UPLOAD_DIR)) {
  mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const avatarMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: AVATAR_UPLOAD_DIR,
    filename: (req: any, file, callback) => {
      const taiKhoan = req.user?.TaiKhoan ? `${req.user.TaiKhoan}-` : '';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `${taiKhoan}${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    if (!allowedImageExtensions.has(extension)) {
      return callback(
        new BadRequestException('Chỉ chấp nhận file ảnh định dạng JPG, JPEG, PNG, WEBP, GIF'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
