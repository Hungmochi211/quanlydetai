

IF OBJECT_ID(N'dbo.YeuCauPhanCongHoiDong', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.YeuCauPhanCongHoiDong (
        Id INT IDENTITY(1, 1) NOT NULL,
        MaDT VARCHAR(50) NOT NULL,
        MaLoaiHoiDong INT NOT NULL,
        MaHoiDong INT NULL,
        TaiKhoanNguoiGui VARCHAR(50) NOT NULL,
        TaiKhoanNguoiXuLy VARCHAR(50) NULL,
        TrangThai NVARCHAR(30) NOT NULL
            CONSTRAINT DF_YeuCauPhanCongHoiDong_TrangThai DEFAULT N'Chờ duyệt',
        LyDoYeuCau NVARCHAR(MAX) NULL,
        LyDoTuChoi NVARCHAR(MAX) NULL,
        YeuCauGocId INT NULL,
        NgayGui DATETIME NOT NULL
            CONSTRAINT DF_YeuCauPhanCongHoiDong_NgayGui DEFAULT GETDATE(),
        NgayXuLy DATETIME NULL,
        CONSTRAINT PK_YeuCauPhanCongHoiDong PRIMARY KEY (Id),
        CONSTRAINT CK_YeuCauPhanCongHoiDong_TrangThai
            CHECK (TrangThai IN (N'Chờ duyệt', N'Đã chấp nhận', N'Từ chối')),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_DeTai
            FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_LoaiHoiDong
            FOREIGN KEY (MaLoaiHoiDong) REFERENCES dbo.LoaiHoiDong(MaLoaiHoiDong),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_HoiDong
            FOREIGN KEY (MaHoiDong) REFERENCES dbo.HoiDong(MaHoiDong),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_NguoiGui
            FOREIGN KEY (TaiKhoanNguoiGui) REFERENCES dbo.NguoiDung(TaiKhoan),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_NguoiXuLy
            FOREIGN KEY (TaiKhoanNguoiXuLy) REFERENCES dbo.NguoiDung(TaiKhoan),
        CONSTRAINT FK_YeuCauPhanCongHoiDong_YeuCauGoc
            FOREIGN KEY (YeuCauGocId) REFERENCES dbo.YeuCauPhanCongHoiDong(Id)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_YeuCauPhanCongHoiDong_ChoDuyet'
      AND object_id = OBJECT_ID(N'dbo.YeuCauPhanCongHoiDong')
)
BEGIN
    CREATE UNIQUE INDEX UX_YeuCauPhanCongHoiDong_ChoDuyet
        ON dbo.YeuCauPhanCongHoiDong (MaDT, MaLoaiHoiDong)
        WHERE TrangThai = N'Chờ duyệt';
END;
GO

-- Không còn dùng hội đồng mặc định để tự gán cho mọi đề tài.
UPDATE dbo.HoiDong
SET LaHoiDongMacDinh = 0
WHERE LaHoiDongMacDinh = 1;
GO
