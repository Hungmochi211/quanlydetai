/*
  Khôi phục liên kết cho các file hồ sơ nghiệm thu đã upload trước khi
  DocumentsService lưu MaHoSoNghiemThu.
*/
UPDATE taiLieu
SET MaHoSoNghiemThu = hoSo.Id
FROM dbo.TaiLieu AS taiLieu
INNER JOIN dbo.HoSoNghiemThu AS hoSo
  ON hoSo.MaDT = taiLieu.MaDT
WHERE taiLieu.MaHoSoNghiemThu IS NULL
  AND taiLieu.LoaiTaiLieu = N'Hồ sơ nghiệm thu';
