/*
  Dùng khi database đã có 4 loại nền tảng:
    1=Xét duyệt, 2=Nghiệm thu, 3=Theo dõi, 4=Thanh lý
  Các mã 5..10 là dữ liệu seed cũ sinh trùng. Chạy trên SQL Server.
*/
SET XACT_ABORT ON;
IF COL_LENGTH(N'dbo.HoiDong', N'LaHoiDongMacDinh') IS NULL
  ALTER TABLE dbo.HoiDong ADD LaHoiDongMacDinh BIT NOT NULL
    CONSTRAINT DF_HoiDong_LaHoiDongMacDinh DEFAULT 0;
GO
BEGIN TRANSACTION;

/* Không xóa hội đồng xét chọn SVNCKH nếu nó đã được gán cho đề tài. */
IF EXISTS (
  SELECT 1
  FROM dbo.HoiDongDeTai hdd
  INNER JOIN dbo.HoiDong hd ON hd.MaHoiDong = hdd.MaHoiDong
  WHERE hd.TenHoiDong = N'Hội đồng xét chọn công trình SVNCKH'
)
  THROW 50001, N'Hội đồng SVNCKH đã được gán cho đề tài; hãy xử lý thủ công trước khi xóa.', 1;

/* Nếu đã có phân công cùng đề tài với loại chuẩn, bỏ phân công loại trùng trước. */
DELETE duplicateAssignment
FROM dbo.HoiDongDeTai duplicateAssignment
INNER JOIN dbo.HoiDongDeTai standardAssignment
  ON standardAssignment.MaDT = duplicateAssignment.MaDT
 AND standardAssignment.MaLoaiHoiDong = CASE duplicateAssignment.MaLoaiHoiDong
    WHEN 5 THEN 1 WHEN 6 THEN 1 WHEN 7 THEN 3 WHEN 8 THEN 2 WHEN 9 THEN 4 END
WHERE duplicateAssignment.MaLoaiHoiDong IN (5, 6, 7, 8, 9);

/* Chuyển các phân công và hội đồng seed cũ sang 4 mã loại có sẵn. */
UPDATE dbo.HoiDongDeTai
SET MaLoaiHoiDong = CASE MaLoaiHoiDong
  WHEN 5 THEN 1 WHEN 6 THEN 1 WHEN 7 THEN 3 WHEN 8 THEN 2 WHEN 9 THEN 4 END
WHERE MaLoaiHoiDong IN (5, 6, 7, 8, 9);

UPDATE dbo.HoiDong
SET MaLoaiHoiDong = CASE MaLoaiHoiDong
  WHEN 5 THEN 1 WHEN 6 THEN 1 WHEN 7 THEN 3 WHEN 8 THEN 2 WHEN 9 THEN 4 END
WHERE MaLoaiHoiDong IN (5, 6, 7, 8, 9);

/* Loại "other" seed cũ không có loại nền tảng tương ứng nên xóa đúng hội đồng seed đó. */
DELETE FROM dbo.HoiDong
WHERE TenHoiDong = N'Hội đồng xét chọn công trình SVNCKH';

DELETE FROM dbo.LoaiHoiDong
WHERE MaLoaiHoiDong IN (5, 6, 7, 8, 9, 10);

/* Mỗi nghiệp vụ giữ một hội đồng mặc định: hội đồng có mã nhỏ nhất trong loại chuẩn. */
UPDATE dbo.HoiDong SET LaHoiDongMacDinh = 0;
UPDATE hd SET LaHoiDongMacDinh = 1
FROM dbo.HoiDong hd
WHERE hd.MaHoiDong IN (
  SELECT MIN(MaHoiDong) FROM dbo.HoiDong WHERE MaLoaiHoiDong IN (1,2,3,4) GROUP BY MaLoaiHoiDong
);

COMMIT TRANSACTION;

SELECT MaLoaiHoiDong, TenLoaiHoiDong, NghiepVu, MoTa
FROM dbo.LoaiHoiDong
ORDER BY MaLoaiHoiDong;
