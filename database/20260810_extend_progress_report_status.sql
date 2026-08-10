/*
  Bổ sung trạng thái cho luồng kết luận báo cáo của Hội đồng theo dõi.
  Chạy một lần trên database QuanLyDeTai sau khi cập nhật backend.
*/

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_BaoCaoTienDo_TrangThai'
    AND parent_object_id = OBJECT_ID(N'dbo.BaoCaoTienDo')
)
BEGIN
  ALTER TABLE dbo.BaoCaoTienDo
  DROP CONSTRAINT CK_BaoCaoTienDo_TrangThai;
END;
GO

ALTER TABLE dbo.BaoCaoTienDo
ADD CONSTRAINT CK_BaoCaoTienDo_TrangThai
CHECK (
  TrangThai IN (
    N'Nháp',
    N'Đã gửi',
    N'Yêu cầu bổ sung',
    N'Yêu cầu điều chỉnh',
    N'Đề xuất thanh lý',
    N'Đạt',
    N'Không đạt'
  )
);
GO
