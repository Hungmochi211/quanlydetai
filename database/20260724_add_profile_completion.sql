/* Tài khoản cũ được xem là hoàn thiện để không bị chuyển hướng ở lần đăng nhập sau. */
IF COL_LENGTH('dbo.NguoiDung', 'DaHoanThienHoSo') IS NULL
BEGIN
  ALTER TABLE dbo.NguoiDung
  ADD DaHoanThienHoSo BIT NOT NULL
    CONSTRAINT DF_NguoiDung_DaHoanThienHoSo DEFAULT 1;
END
GO

UPDATE dbo.NguoiDung
SET DaHoanThienHoSo = 1
WHERE DaHoanThienHoSo IS NULL;
GO
