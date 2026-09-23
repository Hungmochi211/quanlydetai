/* Cho phép lưu hồ sơ nghiệm thu từng phần trong BaoCaoTienDo. */
IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_BaoCaoTienDo_LoaiBaoCao'
    AND parent_object_id = OBJECT_ID(N'dbo.BaoCaoTienDo')
)
BEGIN
  ALTER TABLE dbo.BaoCaoTienDo DROP CONSTRAINT CK_BaoCaoTienDo_LoaiBaoCao;
END;
GO

ALTER TABLE dbo.BaoCaoTienDo
ADD CONSTRAINT CK_BaoCaoTienDo_LoaiBaoCao
CHECK (LoaiBaoCao IN (N'Theo mốc', N'Định kỳ', N'Đột xuất', N'Nghiệm thu từng phần'));
GO
