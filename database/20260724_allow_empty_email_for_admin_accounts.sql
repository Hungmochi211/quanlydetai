/* Tài khoản do Admin cấp chưa có email; người nhận sẽ tự bổ sung khi đăng nhập lần đầu. */
ALTER TABLE dbo.NguoiDung ALTER COLUMN Gmail NVARCHAR(100) NULL;
GO
