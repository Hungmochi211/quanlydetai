# Research Topic Management System – Backend

Backend REST API cho hệ thống quản lý đề tài nghiên cứu khoa học. Ứng dụng quản lý người dùng, đề tài, thành viên, mốc tiến độ, tài liệu minh chứng, thông báo và quy trình xét duyệt nhiều hội đồng.

## Công nghệ

- NestJS + TypeScript
- TypeORM + Microsoft SQL Server
- JWT authentication
- Swagger API documentation
- Multer cho upload tài liệu
- Nodemailer cho luồng quên mật khẩu
- Jest cho unit test

## Chức năng chính

- Đăng ký, đăng nhập JWT, cập nhật hồ sơ và đặt lại mật khẩu qua email.
- Quản lý đề tài, thành viên đề tài, nhóm trưởng, chuyên ngành và giảng viên hướng dẫn.
- Quản lý tiến độ: tạo, sửa, xóa mốc; phân công thành viên; tính phần trăm hoàn thành theo trọng số.
- Upload, xem và tải tài liệu minh chứng với giới hạn kích thước 10 MB.
- Thông báo trong hệ thống và cảnh báo các mốc sắp/quá hạn.
- Xét duyệt nhiều hội đồng: đề tài chỉ chuyển sang `Đã phê duyệt` khi tất cả thành viên hội đồng được chọn đều phê duyệt.
- Phân quyền: chỉ nhóm trưởng được thay đổi đề tài/mốc tiến độ; thông báo chỉ được đọc hoặc xóa bởi người nhận.

## Yêu cầu

- Node.js 20 trở lên
- Microsoft SQL Server đang chạy
- Cơ sở dữ liệu đã có schema các bảng nghiệp vụ

## Cài đặt và chạy

```bash
npm install
copy .env.example .env
```

Điền giá trị thật vào `.env`, đặc biệt là `DB_*`, `JWT_SECRET`, `MAIL_USER` và `MAIL_PASSWORD`.


Chạy môi trường phát triển:

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

Build và chạy production:

```bash
npm run build
npm run start:prod
```

## Kiểm thử

```bash
npm test -- --runInBand
```

Các unit test hiện có kiểm tra đăng nhập JWT, quyền nhóm trưởng, và quy tắc chỉ bắt đầu đề tài sau khi toàn bộ hội đồng phê duyệt.

## Frontend

Frontend nằm tại `../../NCKH`, sử dụng React, TypeScript, Vite và Ant Design.

```bash
cd ../../NCKH
npm install
copy .env.example .env
npm run dev
```

Frontend mặc định chạy ở `http://localhost:5173`; cấu hình API trong `VITE_API_URL`.

## Bảo mật cấu hình

- Không commit file `.env`.
- Dùng Gmail App Password thay vì mật khẩu Gmail thường.
- Dùng `JWT_SECRET` ngẫu nhiên, dài và khác nhau theo từng môi trường.
