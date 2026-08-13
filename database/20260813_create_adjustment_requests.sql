/*
  Phiếu điều chỉnh đề tài.
  Chạy một lần trên database QuanLyDeTai.
*/

IF OBJECT_ID(N'dbo.YeuCauDieuChinhDeTai', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.YeuCauDieuChinhDeTai (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MaDT VARCHAR(50) NOT NULL,
    TaiKhoanNguoiGui VARCHAR(50) NOT NULL,
    TaiKhoanNguoiXuLy VARCHAR(50) NULL,
    NhomDieuChinh NVARCHAR(MAX) NOT NULL,
    ThongTinHienTai NVARCHAR(MAX) NOT NULL,
    NoiDungDeNghi NVARCHAR(MAX) NOT NULL,
    LyDo NVARCHAR(MAX) NOT NULL,
    TrangThai NVARCHAR(30) NOT NULL CONSTRAINT DF_YeuCauDieuChinhDeTai_TrangThai DEFAULT N'Chờ duyệt',
    LyDoTuChoi NVARCHAR(MAX) NULL,
    YeuCauGocId INT NULL,
    NgayGui DATETIME NOT NULL CONSTRAINT DF_YeuCauDieuChinhDeTai_NgayGui DEFAULT GETDATE(),
    NgayXuLy DATETIME NULL,
    CONSTRAINT CK_YeuCauDieuChinhDeTai_TrangThai
      CHECK (TrangThai IN (N'Chờ duyệt', N'Đã chấp nhận', N'Từ chối')),
    CONSTRAINT FK_YeuCauDieuChinhDeTai_DeTai
      FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT) ON DELETE NO ACTION,
    CONSTRAINT FK_YeuCauDieuChinhDeTai_NguoiGui
      FOREIGN KEY (TaiKhoanNguoiGui) REFERENCES dbo.NguoiDung(TaiKhoan) ON DELETE NO ACTION,
    CONSTRAINT FK_YeuCauDieuChinhDeTai_NguoiXuLy
      FOREIGN KEY (TaiKhoanNguoiXuLy) REFERENCES dbo.NguoiDung(TaiKhoan) ON DELETE NO ACTION,
    CONSTRAINT FK_YeuCauDieuChinhDeTai_YeuCauGoc
      FOREIGN KEY (YeuCauGocId) REFERENCES dbo.YeuCauDieuChinhDeTai(Id) ON DELETE NO ACTION
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_YeuCauDieuChinhDeTai_MaDT_TrangThai'
    AND object_id = OBJECT_ID(N'dbo.YeuCauDieuChinhDeTai')
)
BEGIN
  CREATE INDEX IX_YeuCauDieuChinhDeTai_MaDT_TrangThai
  ON dbo.YeuCauDieuChinhDeTai(MaDT, TrangThai);
END;
GO

IF COL_LENGTH(N'dbo.TaiLieu', N'MaYeuCauDieuChinh') IS NULL
BEGIN
  ALTER TABLE dbo.TaiLieu ADD MaYeuCauDieuChinh INT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_TaiLieu_YeuCauDieuChinhDeTai'
)
BEGIN
  ALTER TABLE dbo.TaiLieu
  ADD CONSTRAINT FK_TaiLieu_YeuCauDieuChinhDeTai
  FOREIGN KEY (MaYeuCauDieuChinh)
  REFERENCES dbo.YeuCauDieuChinhDeTai(Id)
  ON DELETE NO ACTION;
END;
GO
