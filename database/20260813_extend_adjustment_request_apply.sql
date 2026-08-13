/* Chạy một lần sau 20260813_create_adjustment_requests.sql */
IF COL_LENGTH(N'dbo.YeuCauDieuChinhDeTai', N'DaApDung') IS NULL
  ALTER TABLE dbo.YeuCauDieuChinhDeTai ADD DaApDung BIT NOT NULL CONSTRAINT DF_YeuCauDieuChinhDeTai_DaApDung DEFAULT 0;
GO
IF COL_LENGTH(N'dbo.YeuCauDieuChinhDeTai', N'NgayApDung') IS NULL
  ALTER TABLE dbo.YeuCauDieuChinhDeTai ADD NgayApDung DATETIME NULL;
GO
IF COL_LENGTH(N'dbo.YeuCauDieuChinhDeTai', N'NoiDungDaApDung') IS NULL
  ALTER TABLE dbo.YeuCauDieuChinhDeTai ADD NoiDungDaApDung NVARCHAR(MAX) NULL;
GO
