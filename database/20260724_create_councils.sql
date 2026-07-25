/*
  Cài mới hệ thống Hội đồng linh hoạt.
  Chạy trên SQL Server trước khi khởi động backend.
*/

IF OBJECT_ID('dbo.LoaiHoiDong', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.LoaiHoiDong (
    MaLoaiHoiDong INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    TenLoaiHoiDong NVARCHAR(100) NOT NULL,
    NghiepVu VARCHAR(30) NOT NULL
      CONSTRAINT DF_LoaiHoiDong_NghiepVu DEFAULT 'other',
    MoTa NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_LoaiHoiDong_Ten UNIQUE (TenLoaiHoiDong),
    CONSTRAINT CK_LoaiHoiDong_NghiepVu
      CHECK (NghiepVu IN ('approval', 'scoring', 'monitoring', 'liquidation', 'other'))
  );
END
GO

/* Các loại nền tảng. Backend sẽ tạo thêm các loại/hội đồng mặc định khi khởi động. */
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiHoiDong WHERE TenLoaiHoiDong = N'Xét duyệt')
  INSERT INTO dbo.LoaiHoiDong (TenLoaiHoiDong, NghiepVu) VALUES (N'Xét duyệt', 'approval');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiHoiDong WHERE TenLoaiHoiDong = N'Nghiệm thu')
  INSERT INTO dbo.LoaiHoiDong (TenLoaiHoiDong, NghiepVu) VALUES (N'Nghiệm thu', 'scoring');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiHoiDong WHERE TenLoaiHoiDong = N'Theo dõi')
  INSERT INTO dbo.LoaiHoiDong (TenLoaiHoiDong, NghiepVu) VALUES (N'Theo dõi', 'monitoring');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiHoiDong WHERE TenLoaiHoiDong = N'Thanh lý')
  INSERT INTO dbo.LoaiHoiDong (TenLoaiHoiDong, NghiepVu) VALUES (N'Thanh lý', 'liquidation');
GO

IF OBJECT_ID('dbo.HoiDong', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.HoiDong (
    MaHoiDong INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    TenHoiDong NVARCHAR(200) NOT NULL,
    MaLoaiHoiDong INT NOT NULL,
    MoTa NVARCHAR(MAX) NULL,
    NgayTao DATETIME NOT NULL
      CONSTRAINT DF_HoiDong_NgayTao DEFAULT GETDATE(),
    CONSTRAINT FK_HoiDong_LoaiHoiDong
      FOREIGN KEY (MaLoaiHoiDong) REFERENCES dbo.LoaiHoiDong(MaLoaiHoiDong)
  );
END
GO

IF OBJECT_ID('dbo.ThanhVienHoiDong', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ThanhVienHoiDong (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaHoiDong INT NOT NULL,
    TaiKhoan VARCHAR(50) NOT NULL,
    ChucDanh NVARCHAR(50) NOT NULL
      CONSTRAINT DF_ThanhVienHoiDong_ChucDanh DEFAULT N'Ủy viên',
    CONSTRAINT UQ_ThanhVienHoiDong_HoiDong_TaiKhoan UNIQUE (MaHoiDong, TaiKhoan),
    CONSTRAINT FK_ThanhVienHoiDong_HoiDong
      FOREIGN KEY (MaHoiDong) REFERENCES dbo.HoiDong(MaHoiDong) ON DELETE CASCADE,
    CONSTRAINT FK_ThanhVienHoiDong_NguoiDung
      FOREIGN KEY (TaiKhoan) REFERENCES dbo.NguoiDung(TaiKhoan),
    CONSTRAINT CK_ThanhVienHoiDong_ChucDanh
      CHECK (ChucDanh IN (N'Chủ tịch', N'Thư ký', N'Ủy viên', N'Phản biện'))
  );
END
GO

IF OBJECT_ID('dbo.HoiDongDeTai', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.HoiDongDeTai (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaHoiDong INT NOT NULL,
    MaDT VARCHAR(50) NOT NULL,
    MaLoaiHoiDong INT NOT NULL,
    NgayPhanCong DATETIME NOT NULL
      CONSTRAINT DF_HoiDongDeTai_NgayPhanCong DEFAULT GETDATE(),
    CONSTRAINT UQ_HoiDongDeTai_DeTai_Loai UNIQUE (MaDT, MaLoaiHoiDong),
    CONSTRAINT UQ_HoiDongDeTai_DeTai_HoiDong UNIQUE (MaDT, MaHoiDong),
    CONSTRAINT FK_HoiDongDeTai_HoiDong
      FOREIGN KEY (MaHoiDong) REFERENCES dbo.HoiDong(MaHoiDong) ON DELETE CASCADE,
    CONSTRAINT FK_HoiDongDeTai_DeTai
      FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT),
    CONSTRAINT FK_HoiDongDeTai_LoaiHoiDong
      FOREIGN KEY (MaLoaiHoiDong) REFERENCES dbo.LoaiHoiDong(MaLoaiHoiDong)
  );
END
GO

/* Lưu vết hội đồng đã nhận xét/chấm điểm đề tài. */
IF COL_LENGTH('dbo.XetDuyetDeTai', 'MaHoiDong') IS NULL
BEGIN
  ALTER TABLE dbo.XetDuyetDeTai ADD MaHoiDong INT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_XetDuyetDeTai_HoiDong')
BEGIN
  ALTER TABLE dbo.XetDuyetDeTai
  ADD CONSTRAINT FK_XetDuyetDeTai_HoiDong
    FOREIGN KEY (MaHoiDong) REFERENCES dbo.HoiDong(MaHoiDong);
END
GO
