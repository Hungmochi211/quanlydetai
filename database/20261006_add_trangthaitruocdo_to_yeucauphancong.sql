/* Thêm cột TrangThaiTruocDo vào bảng dbo.YeuCauPhanCongHoiDong để khôi phục trạng thái cũ của đề tài khi bị từ chối */
IF COL_LENGTH(N'dbo.YeuCauPhanCongHoiDong', N'TrangThaiTruocDo') IS NULL
BEGIN
    ALTER TABLE dbo.YeuCauPhanCongHoiDong ADD TrangThaiTruocDo NVARCHAR(50) NULL;
END;
GO
