/*
  Luồng yêu cầu phân công hội đồng theo từng đề tài.
  Chạy một lần trên SQL Server trước khi khởi động backend với DB_SYNCHRONIZE=false.
*/

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

/*
  Tương thích dữ liệu cũ:
  Mỗi hội đồng đã gán trong HoiDongDeTai được xem như một yêu cầu đã chấp nhận.
  Nhờ đó đề tài cũ vẫn hiển thị đúng hội đồng và không bị yêu cầu gán lại.
*/
INSERT INTO dbo.YeuCauPhanCongHoiDong (
    MaDT,
    MaLoaiHoiDong,
    MaHoiDong,
    TaiKhoanNguoiGui,
    TrangThai,
    LyDoYeuCau,
    NgayGui,
    NgayXuLy
)
SELECT
    assignment.MaDT,
    assignment.MaLoaiHoiDong,
    assignment.MaHoiDong,
    leader.TaiKhoan,
    N'Đã chấp nhận',
    N'Dữ liệu phân công hội đồng được chuyển từ hệ thống cũ.',
    assignment.NgayPhanCong,
    assignment.NgayPhanCong
FROM dbo.HoiDongDeTai AS assignment
CROSS APPLY (
    SELECT TOP (1) member.TaiKhoan
    FROM dbo.ThanhVienDT AS member
    WHERE member.MaDT = assignment.MaDT
      AND member.VaiTroDT = N'Nhóm trưởng'
    ORDER BY member.idTV ASC
) AS leader
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.YeuCauPhanCongHoiDong AS request
    WHERE request.MaDT = assignment.MaDT
      AND request.MaHoiDong = assignment.MaHoiDong
);
GO

-- Không còn dùng hội đồng mặc định để tự gán cho mọi đề tài.
UPDATE dbo.HoiDong
SET LaHoiDongMacDinh = 0
WHERE LaHoiDongMacDinh = 1;
GO
