import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname } from "path";

const uploadPath = './uploads/documents';
if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
}

export const taiLieuMulterOptions = {
    storage: diskStorage({
        destination: uploadPath,
        //auth tên file
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
        }
    }),
    fileFilter: (req, file, callback) => {
        if (file.originalname.match(/\.(jpg|jpeg|png|pdf|docx|doc|xlsx|pptx)$/i)) {
            return callback(new Error('Không hỗ trợ định dạng file này'), false);
        }
        callback(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
};