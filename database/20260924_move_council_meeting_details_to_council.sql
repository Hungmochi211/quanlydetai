/* Thông tin cuộc họp thuộc về từng hội đồng, không thuộc về loại hội đồng. */
IF COL_LENGTH(N'dbo.HoiDong', N'ThoiGianHop') IS NULL
  ALTER TABLE dbo.HoiDong ADD ThoiGianHop DATETIME NULL;
GO

IF COL_LENGTH(N'dbo.HoiDong', N'HinhThucHop') IS NULL
  ALTER TABLE dbo.HoiDong ADD HinhThucHop VARCHAR(10) NULL;
GO

IF COL_LENGTH(N'dbo.HoiDong', N'DiaDiem') IS NULL
  ALTER TABLE dbo.HoiDong ADD DiaDiem NVARCHAR(300) NULL;
GO

IF COL_LENGTH(N'dbo.HoiDong', N'LinkHop') IS NULL
  ALTER TABLE dbo.HoiDong ADD LinkHop NVARCHAR(500) NULL;
GO

/* Bảo toàn dữ liệu nếu hệ thống từng lưu nhầm ở loại hội đồng. */
IF COL_LENGTH(N'dbo.LoaiHoiDong', N'ThoiGianHop') IS NOT NULL
  AND COL_LENGTH(N'dbo.LoaiHoiDong', N'HinhThucHop') IS NOT NULL
  AND COL_LENGTH(N'dbo.LoaiHoiDong', N'DiaDiem') IS NOT NULL
  AND COL_LENGTH(N'dbo.LoaiHoiDong', N'LinkHop') IS NOT NULL
BEGIN
  UPDATE hd
  SET
    ThoiGianHop = COALESCE(hd.ThoiGianHop, lhd.ThoiGianHop),
    HinhThucHop = COALESCE(hd.HinhThucHop, lhd.HinhThucHop),
    DiaDiem = COALESCE(hd.DiaDiem, lhd.DiaDiem),
    LinkHop = COALESCE(hd.LinkHop, lhd.LinkHop)
  FROM dbo.HoiDong hd
  INNER JOIN dbo.LoaiHoiDong lhd ON lhd.MaLoaiHoiDong = hd.MaLoaiHoiDong;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_HoiDong_HinhThucHop'
    AND parent_object_id = OBJECT_ID(N'dbo.HoiDong')
)
  ALTER TABLE dbo.HoiDong
  ADD CONSTRAINT CK_HoiDong_HinhThucHop
  CHECK (HinhThucHop IS NULL OR HinhThucHop IN ('online', 'offline'));
GO
