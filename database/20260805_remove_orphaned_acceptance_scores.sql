/*
  Dọn dữ liệu cũ: xóa phiếu chấm của tài khoản không còn là thành viên
  hội đồng nghiệm thu được phân công cho đề tài tương ứng.

  Chỉ xử lý đề tài đã có HoiDongDeTai loại nghiệp vụ "scoring" để không
  làm mất dữ liệu lịch sử của đề tài cũ chưa được backfill phân công hội đồng.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @HoSoBiAnhHuong TABLE (
  Id INT PRIMARY KEY
);

DELETE score
OUTPUT deleted.MaHoSoNghiemThu INTO @HoSoBiAnhHuong (Id)
FROM dbo.PhieuChamNghiemThu AS score
INNER JOIN dbo.HoSoNghiemThu AS dossier
  ON dossier.Id = score.MaHoSoNghiemThu
WHERE EXISTS (
  SELECT 1
  FROM dbo.HoiDongDeTai AS assignment
  INNER JOIN dbo.LoaiHoiDong AS councilType
    ON councilType.MaLoaiHoiDong = assignment.MaLoaiHoiDong
  WHERE assignment.MaDT = dossier.MaDT
    AND councilType.NghiepVu = 'scoring'
)
AND NOT EXISTS (
  SELECT 1
  FROM dbo.HoiDongDeTai AS assignment
  INNER JOIN dbo.LoaiHoiDong AS councilType
    ON councilType.MaLoaiHoiDong = assignment.MaLoaiHoiDong
  INNER JOIN dbo.ThanhVienHoiDong AS member
    ON member.MaHoiDong = assignment.MaHoiDong
  WHERE assignment.MaDT = dossier.MaDT
    AND councilType.NghiepVu = 'scoring'
    AND member.TaiKhoan = score.TaiKhoanHoiDong
);

UPDATE dossier
SET DiemTrungBinh = averageScore.DiemTrungBinh
FROM dbo.HoSoNghiemThu AS dossier
INNER JOIN @HoSoBiAnhHuong AS affected
  ON affected.Id = dossier.Id
OUTER APPLY (
  SELECT CAST(AVG(CAST(score.Diem AS DECIMAL(5, 2))) AS DECIMAL(5, 2)) AS DiemTrungBinh
  FROM dbo.PhieuChamNghiemThu AS score
  WHERE score.MaHoSoNghiemThu = dossier.Id
    AND score.TrangThai = N'Đã gửi'
) AS averageScore;

COMMIT TRANSACTION;
