/* Thêm cột Avatar vào bảng dbo.NguoiDung để lưu đường dẫn ảnh đại diện */
IF COL_LENGTH(N'dbo.NguoiDung', N'Avatar') IS NULL
BEGIN
    ALTER TABLE dbo.NguoiDung ADD Avatar NVARCHAR(500) NULL;
END;
GO
