/* Dọn các cột cuộc họp từng được tạo nhầm ở LoaiHoiDong.
   Thông tin cuộc họp hiện được lưu tại HoiDong. */
IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_LoaiHoiDong_HinhThucHop'
    AND parent_object_id = OBJECT_ID(N'dbo.LoaiHoiDong')
)
  ALTER TABLE dbo.LoaiHoiDong DROP CONSTRAINT CK_LoaiHoiDong_HinhThucHop;
GO

IF COL_LENGTH(N'dbo.LoaiHoiDong', N'ThoiGianHop') IS NOT NULL
  ALTER TABLE dbo.LoaiHoiDong DROP COLUMN ThoiGianHop;
GO

IF COL_LENGTH(N'dbo.LoaiHoiDong', N'HinhThucHop') IS NOT NULL
  ALTER TABLE dbo.LoaiHoiDong DROP COLUMN HinhThucHop;
GO

IF COL_LENGTH(N'dbo.LoaiHoiDong', N'DiaDiem') IS NOT NULL
  ALTER TABLE dbo.LoaiHoiDong DROP COLUMN DiaDiem;
GO

IF COL_LENGTH(N'dbo.LoaiHoiDong', N'LinkHop') IS NOT NULL
  ALTER TABLE dbo.LoaiHoiDong DROP COLUMN LinkHop;
GO
