/* Hồ sơ và phiếu chấm nghiệm thu. Chạy một lần trên SQL Server. */
IF OBJECT_ID(N'dbo.HoSoNghiemThu', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.HoSoNghiemThu (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaDT VARCHAR(50) NOT NULL,
    TaiKhoanNguoiGui VARCHAR(50) NOT NULL,
    GhiChu NVARCHAR(MAX) NULL,
    TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_HSNT_TrangThai DEFAULT N'Nháp',
    DiemTrungBinh DECIMAL(5,2) NULL,
    DiemCuoiCung DECIMAL(5,2) NULL,
    ChatLuong NVARCHAR(100) NULL,
    KetQuaCuoiCung NVARCHAR(30) NULL,
    NhanXetChuTich NVARCHAR(MAX) NULL,
    TaiKhoanChuTichChot VARCHAR(50) NULL,
    NgayGui DATETIME NULL, NgayChot DATETIME NULL,
    NgayTao DATETIME NOT NULL CONSTRAINT DF_HSNT_NgayTao DEFAULT GETDATE(),
    NgayCapNhat DATETIME NOT NULL CONSTRAINT DF_HSNT_NgayCapNhat DEFAULT GETDATE(),
    CONSTRAINT UQ_HSNT_MaDT UNIQUE (MaDT),
    CONSTRAINT FK_HSNT_DeTai FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT) ON DELETE CASCADE,
    CONSTRAINT FK_HSNT_NguoiGui FOREIGN KEY (TaiKhoanNguoiGui) REFERENCES dbo.NguoiDung(TaiKhoan),
    CONSTRAINT FK_HSNT_ChuTich FOREIGN KEY (TaiKhoanChuTichChot) REFERENCES dbo.NguoiDung(TaiKhoan),
    CONSTRAINT CK_HSNT_DiemTB CHECK (DiemTrungBinh IS NULL OR DiemTrungBinh BETWEEN 0 AND 10),
    CONSTRAINT CK_HSNT_DiemCuoi CHECK (DiemCuoiCung IS NULL OR DiemCuoiCung BETWEEN 0 AND 10)
  );
END;
GO

IF OBJECT_ID(N'dbo.PhieuChamNghiemThu', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PhieuChamNghiemThu (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaHoSoNghiemThu INT NOT NULL,
    TaiKhoanHoiDong VARCHAR(50) NOT NULL,
    Diem DECIMAL(5,2) NULL,
    NhanXet NVARCHAR(MAX) NULL,
    TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_PCNT_TrangThai DEFAULT N'Nháp',
    NgayGui DATETIME NULL,
    NgayCapNhat DATETIME NOT NULL CONSTRAINT DF_PCNT_NgayCapNhat DEFAULT GETDATE(),
    CONSTRAINT UQ_PCNT_HoSo_TaiKhoan UNIQUE (MaHoSoNghiemThu, TaiKhoanHoiDong),
    CONSTRAINT FK_PCNT_HoSo FOREIGN KEY (MaHoSoNghiemThu) REFERENCES dbo.HoSoNghiemThu(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PCNT_NguoiCham FOREIGN KEY (TaiKhoanHoiDong) REFERENCES dbo.NguoiDung(TaiKhoan),
    CONSTRAINT CK_PCNT_Diem CHECK (Diem IS NULL OR Diem BETWEEN 0 AND 10)
  );
END;
GO

IF COL_LENGTH(N'dbo.TaiLieu', N'MaHoSoNghiemThu') IS NULL
  ALTER TABLE dbo.TaiLieu ADD MaHoSoNghiemThu INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TaiLieu_HoSoNghiemThu')
  ALTER TABLE dbo.TaiLieu ADD CONSTRAINT FK_TaiLieu_HoSoNghiemThu FOREIGN KEY (MaHoSoNghiemThu) REFERENCES dbo.HoSoNghiemThu(Id) ON DELETE NO ACTION;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TaiLieu_HoSoNghiemThu' AND object_id = OBJECT_ID(N'dbo.TaiLieu'))
  CREATE INDEX IX_TaiLieu_HoSoNghiemThu ON dbo.TaiLieu(MaHoSoNghiemThu);
GO

/* Tương thích dữ liệu cũ: đề tài đã hoàn tất 100% trước khi có luồng nghiệm thu. */
UPDATE dbo.DeTai
SET TrangThai = N'Chờ nghiệm thu'
WHERE ISNULL(TienDo, 0) >= 100
  AND TrangThai IN (N'Hoàn thành', N'Đã phê duyệt', N'Đang thực hiện');
GO

/* Đồng bộ thang điểm nghiệm thu từ 0 đến 10 cho cả cơ sở dữ liệu đã tạo trước đó. */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_HSNT_DiemTB')
  ALTER TABLE dbo.HoSoNghiemThu DROP CONSTRAINT CK_HSNT_DiemTB;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_HSNT_DiemCuoi')
  ALTER TABLE dbo.HoSoNghiemThu DROP CONSTRAINT CK_HSNT_DiemCuoi;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_PCNT_Diem')
  ALTER TABLE dbo.PhieuChamNghiemThu DROP CONSTRAINT CK_PCNT_Diem;
GO
ALTER TABLE dbo.HoSoNghiemThu ADD CONSTRAINT CK_HSNT_DiemTB CHECK (DiemTrungBinh IS NULL OR DiemTrungBinh BETWEEN 0 AND 10);
ALTER TABLE dbo.HoSoNghiemThu ADD CONSTRAINT CK_HSNT_DiemCuoi CHECK (DiemCuoiCung IS NULL OR DiemCuoiCung BETWEEN 0 AND 10);
ALTER TABLE dbo.PhieuChamNghiemThu ADD CONSTRAINT CK_PCNT_Diem CHECK (Diem IS NULL OR Diem BETWEEN 0 AND 10);
GO
