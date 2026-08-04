# QLDTKH Backend

REST API cho hệ thống quản lý đề tài nghiên cứu khoa học sinh viên, xây dựng bằng NestJS. Backend quản lý toàn bộ vòng đời đề tài: đăng ký, xét duyệt, theo dõi tiến độ, báo cáo, nghiệm thu và phân công hội đồng theo từng đề tài.

## Công nghệ

- NestJS 11 và TypeScript
- TypeORM và Microsoft SQL Server
- JWT authentication, guards và phân quyền theo ngữ cảnh đề tài/hội đồng
- Swagger API documentation
- Multer cho upload tài liệu riêng tư
- Nodemailer cho luồng email
- Jest cho unit test

## Chức năng chính

- Xác thực JWT, hoàn thiện hồ sơ, thay đổi/quên mật khẩu.
- Đăng ký đề tài, thành viên đề tài, nhóm trưởng và giảng viên hướng dẫn.
- Mốc tiến độ có trọng số, kiểm tra tổng trọng số và cập nhật trạng thái theo lịch.
- Báo cáo tiến độ theo mốc hoặc định kỳ, đính kèm minh chứng và phản hồi từ hội đồng.
- Phân quyền xem/tải tài liệu cho thành viên đề tài, hội đồng được phân công và Admin.
- Xét duyệt nhiều thành viên: đề tài chỉ bắt đầu khi tất cả thành viên xét duyệt đồng ý; lưu lịch sử và chỉ tạo lại phiếu cho người từ chối.
- Hội đồng linh hoạt theo loại nghiệp vụ: xét duyệt, theo dõi, nghiệm thu, thanh lý và loại khác.
- Yêu cầu phân công hội đồng: nhóm trưởng gửi yêu cầu, Admin chấp nhận/từ chối kèm lý do, cho phép gửi lại yêu cầu bị từ chối.
- Nghiệm thu: chấm điểm, tính điểm trung bình, Chủ tịch chốt điểm, chất lượng, kết quả và kết luận.

## Yêu cầu

- Node.js 20 trở lên
- Microsoft SQL Server
- Database schema nghiệp vụ hiện có

## Cài đặt

```bash
npm install
copy .env.example .env
```

Điền các giá trị thực trong `.env`. Không commit file này.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=your_sql_server_username
DB_PASSWORD=your_sql_server_password
DB_DATABASE=your_database_name
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_SYNCHRONIZE=false
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h
FRONTEND_URL=http://localhost:5173
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
```

## Database cho luồng hội đồng

Khi `DB_SYNCHRONIZE=false`, chạy script sau trên SQL Server trước khi chạy backend:

## Chạy ứng dụng

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

Build production:

```bash
npm run build
npm run start:prod
```

## API tiêu biểu

| Chức năng | Endpoint |
|---|---|
| Gửi yêu cầu phân công | `POST /council-requests/projects/:maDT` |
| Xem yêu cầu của tôi | `GET /council-requests/my` |
| Gửi lại yêu cầu | `POST /council-requests/:id/resubmit` |
| Danh mục loại hội đồng | `GET /council-requests/types` |
| Admin xem yêu cầu chờ xử lý | `GET /admin/councils/requests?status=Chờ duyệt` |
| Admin chấp nhận | `PATCH /admin/councils/requests/:id/approve` |
| Admin từ chối | `PATCH /admin/councils/requests/:id/reject` |
| Gửi xét duyệt | `POST /project/:id/submit-for-approval` |
| Phản hồi xét duyệt | `POST /project/:id/review` |

## Kiểm thử và scripts

```bash
npm run build                    # Build NestJS
npm test -- --runInBand          # Chạy unit test
npm run test:cov                 # Báo cáo coverage
npm run fix:document-filenames   # Sửa tên file tiếng Việt bị lỗi mã hóa
```

Hiện có các test cho xác thực, quản trị tài khoản, quản lý hội đồng và luồng xét duyệt đề tài.

## Quy tắc bảo mật

- Không commit `.env`, mật khẩu SQL Server, JWT secret hay mật khẩu email.
- Dùng Gmail App Password thay vì mật khẩu Gmail thông thường.
- Backend kiểm tra quyền theo tài khoản, thành viên đề tài và hội đồng được gán; frontend chỉ đóng vai trò hỗ trợ hiển thị quyền.
