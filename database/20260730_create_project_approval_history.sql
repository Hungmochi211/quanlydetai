IF OBJECT_ID(N'dbo.LichSuXetDuyetDeTai', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LichSuXetDuyetDeTai (
        Id INT IDENTITY(1, 1) NOT NULL PRIMARY KEY,
        MaDT VARCHAR(50) NOT NULL,
        LanXetDuyet INT NOT NULL,
        TaiKhoanHoiDong VARCHAR(50) NOT NULL,
        MaHoiDong INT NULL,
        LoaiHoiDong NVARCHAR(30) NOT NULL CONSTRAINT DF_LichSuXetDuyetDeTai_LoaiHoiDong DEFAULT N'Xét duyệt',
        TrangThai NVARCHAR(30) NOT NULL,
        GhiChu NVARCHAR(MAX) NULL,
        NgayTao DATETIME NULL,
        NgayPhanHoi DATETIME NULL,
        NgayLuu DATETIME NOT NULL CONSTRAINT DF_LichSuXetDuyetDeTai_NgayLuu DEFAULT GETDATE(),
        CONSTRAINT FK_LichSuXetDuyetDeTai_DeTai
            FOREIGN KEY (MaDT) REFERENCES dbo.DeTai(MaDT) ON DELETE NO ACTION,
        CONSTRAINT FK_LichSuXetDuyetDeTai_NguoiDung
            FOREIGN KEY (TaiKhoanHoiDong) REFERENCES dbo.NguoiDung(TaiKhoan) ON DELETE NO ACTION
    );

    CREATE INDEX IX_LichSuXetDuyetDeTai_MaDT_LanXetDuyet
        ON dbo.LichSuXetDuyetDeTai(MaDT, LanXetDuyet);
END;
