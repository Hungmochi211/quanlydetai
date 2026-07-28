/* Báo cáo tiến độ và tài liệu minh chứng. Chạy một lần trên SQL Server. */
IF COL_LENGTH(N'dbo.HoiDong', N'LaHoiDongMacDinh') IS NULL
BEGIN
    ALTER TABLE dbo.HoiDong ADD LaHoiDongMacDinh BIT NOT NULL
        CONSTRAINT DF_HoiDong_LaHoiDongMacDinh DEFAULT 0;
END;
GO

/* Cấu hình sẵn hội đồng theo dõi được seed làm hội đồng tự động. */
UPDATE hd
SET LaHoiDongMacDinh = 1
FROM dbo.HoiDong hd
INNER JOIN dbo.LoaiHoiDong lhd ON lhd.MaLoaiHoiDong = hd.MaLoaiHoiDong
WHERE lhd.NghiepVu = 'monitoring'
  AND hd.MaHoiDong = (
      SELECT MIN(hd1.MaHoiDong)
      FROM dbo.HoiDong hd1
      INNER JOIN dbo.LoaiHoiDong lhd1 ON lhd1.MaLoaiHoiDong = hd1.MaLoaiHoiDong
      WHERE lhd1.NghiepVu = 'monitoring'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.HoiDong hd2
      INNER JOIN dbo.LoaiHoiDong lhd2 ON lhd2.MaLoaiHoiDong = hd2.MaLoaiHoiDong
      WHERE lhd2.NghiepVu = 'monitoring' AND hd2.LaHoiDongMacDinh = 1
  );
GO

/* Hội đồng xét duyệt mặc định: dùng khi nhóm trưởng gửi yêu cầu xét duyệt. */
UPDATE hd
SET LaHoiDongMacDinh = 1
FROM dbo.HoiDong hd
INNER JOIN dbo.LoaiHoiDong lhd ON lhd.MaLoaiHoiDong = hd.MaLoaiHoiDong
WHERE lhd.NghiepVu = 'approval'
  AND hd.MaHoiDong = (
      SELECT MIN(hd1.MaHoiDong) FROM dbo.HoiDong hd1
      INNER JOIN dbo.LoaiHoiDong lhd1 ON lhd1.MaLoaiHoiDong = hd1.MaLoaiHoiDong
      WHERE lhd1.NghiepVu = 'approval'
  )
  AND NOT EXISTS (
      SELECT 1 FROM dbo.HoiDong hd2
      INNER JOIN dbo.LoaiHoiDong lhd2 ON lhd2.MaLoaiHoiDong = hd2.MaLoaiHoiDong
      WHERE lhd2.NghiepVu = 'approval' AND hd2.LaHoiDongMacDinh = 1
  );
GO

IF OBJECT_ID(N'dbo.BaoCaoTienDo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BaoCaoTienDo (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        MaDT VARCHAR(50) NOT NULL,
        MaMoc INT NULL,
        LoaiBaoCao NVARCHAR(30) NOT NULL CONSTRAINT DF_BaoCaoTienDo_LoaiBaoCao DEFAULT N'Theo mốc',
        KyBaoCao NVARCHAR(100) NOT NULL,
        NoiDungBaoCao NVARCHAR(MAX) NOT NULL,
        TienDoBaoCao DECIMAL(5,2) NULL,
        KhoKhan NVARCHAR(MAX) NULL,
        DeXuat NVARCHAR(MAX) NULL,
        TaiKhoanNguoiGui VARCHAR(50) NOT NULL,
        TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_BaoCaoTienDo_TrangThai DEFAULT N'Nháp',
        NhanXetHoiDong NVARCHAR(MAX) NULL,
        TaiKhoanHoiDong VARCHAR(50) NULL,
        NgayGui DATETIME NULL,
        NgayPhanHoi DATETIME NULL,
        NgayTao DATETIME NOT NULL CONSTRAINT DF_BaoCaoTienDo_NgayTao DEFAULT GETDATE(),
        NgayCapNhat DATETIME NOT NULL CONSTRAINT DF_BaoCaoTienDo_NgayCapNhat DEFAULT GETDATE(),
        CONSTRAINT CK_BaoCaoTienDo_TrangThai CHECK (TrangThai IN (N'Nháp', N'Đã gửi', N'Yêu cầu bổ sung', N'Đạt', N'Không đạt')),
        CONSTRAINT CK_BaoCaoTienDo_TienDo CHECK (TienDoBaoCao IS NULL OR (TienDoBaoCao >= 0 AND TienDoBaoCao <= 100)),
        CONSTRAINT FK_BaoCaoTienDo_DeTai FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT) ON DELETE CASCADE,
        CONSTRAINT FK_BaoCaoTienDo_MocDeTai FOREIGN KEY (MaMoc) REFERENCES dbo.MocDeTai(MaMoc),
        CONSTRAINT FK_BaoCaoTienDo_NguoiGui FOREIGN KEY (TaiKhoanNguoiGui) REFERENCES dbo.NguoiDung(TaiKhoan),
        CONSTRAINT FK_BaoCaoTienDo_NguoiHoiDong FOREIGN KEY (TaiKhoanHoiDong) REFERENCES dbo.NguoiDung(TaiKhoan)
    );
END;
GO

IF COL_LENGTH(N'dbo.BaoCaoTienDo', N'MaMoc') IS NULL
BEGIN
    ALTER TABLE dbo.BaoCaoTienDo ADD MaMoc INT NULL;
END;
GO

IF COL_LENGTH(N'dbo.BaoCaoTienDo', N'LoaiBaoCao') IS NULL
BEGIN
    ALTER TABLE dbo.BaoCaoTienDo ADD LoaiBaoCao NVARCHAR(30) NOT NULL
      CONSTRAINT DF_BaoCaoTienDo_LoaiBaoCao DEFAULT N'Theo mốc';
END;
GO

/* Chỉ cho phép ba loại báo cáo mà hệ thống hỗ trợ. */
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_BaoCaoTienDo_LoaiBaoCao'
      AND parent_object_id = OBJECT_ID(N'dbo.BaoCaoTienDo')
)
BEGIN
    ALTER TABLE dbo.BaoCaoTienDo
    ADD CONSTRAINT CK_BaoCaoTienDo_LoaiBaoCao
    CHECK (LoaiBaoCao IN (N'Theo mốc', N'Định kỳ', N'Đột xuất'));
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BaoCaoTienDo_MocDeTai')
BEGIN
    ALTER TABLE dbo.BaoCaoTienDo
    ADD CONSTRAINT FK_BaoCaoTienDo_MocDeTai
    FOREIGN KEY (MaMoc) REFERENCES dbo.MocDeTai(MaMoc);
END;
GO

IF COL_LENGTH(N'dbo.TaiLieu', N'MaBaoCaoTienDo') IS NULL
BEGIN
    ALTER TABLE dbo.TaiLieu ADD MaBaoCaoTienDo INT NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TaiLieu_BaoCaoTienDo')
BEGIN
    ALTER TABLE dbo.TaiLieu
    ADD CONSTRAINT FK_TaiLieu_BaoCaoTienDo
    FOREIGN KEY (MaBaoCaoTienDo) REFERENCES dbo.BaoCaoTienDo(Id) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BaoCaoTienDo_MaDT' AND object_id = OBJECT_ID(N'dbo.BaoCaoTienDo'))
    CREATE INDEX IX_BaoCaoTienDo_MaDT ON dbo.BaoCaoTienDo(MaDT, NgayTao DESC);
GO

/* Mỗi mốc có một báo cáo; dữ liệu cũ chưa liên kết mốc vẫn được giữ lại. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_BaoCaoTienDo_MaDT_MaMoc' AND object_id = OBJECT_ID(N'dbo.BaoCaoTienDo'))
    CREATE UNIQUE INDEX UQ_BaoCaoTienDo_MaDT_MaMoc
    ON dbo.BaoCaoTienDo(MaDT, MaMoc)
    WHERE MaMoc IS NOT NULL;
GO

/* Lịch sử phản hồi vẫn được giữ khi nhóm trưởng bổ sung và gửi lại báo cáo. */
IF OBJECT_ID(N'dbo.PhanHoiBaoCaoTienDo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PhanHoiBaoCaoTienDo (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        MaBaoCaoTienDo INT NOT NULL,
        TaiKhoanHoiDong VARCHAR(50) NOT NULL,
        KetQua NVARCHAR(30) NOT NULL,
        NhanXet NVARCHAR(MAX) NOT NULL,
        NgayPhanHoi DATETIME NOT NULL CONSTRAINT DF_PhanHoiBaoCaoTienDo_NgayPhanHoi DEFAULT GETDATE(),
        CONSTRAINT FK_PhanHoiBaoCaoTienDo_BaoCao FOREIGN KEY (MaBaoCaoTienDo)
            REFERENCES dbo.BaoCaoTienDo(Id) ON DELETE CASCADE,
        CONSTRAINT FK_PhanHoiBaoCaoTienDo_NguoiDung FOREIGN KEY (TaiKhoanHoiDong)
            REFERENCES dbo.NguoiDung(TaiKhoan)
    );
    CREATE INDEX IX_PhanHoiBaoCaoTienDo_BaoCao ON dbo.PhanHoiBaoCaoTienDo(MaBaoCaoTienDo, NgayPhanHoi DESC);
END;
GO
