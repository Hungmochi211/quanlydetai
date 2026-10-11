/* Chuyển cột SDT từ INT sang VARCHAR(20) trong bảng NguoiDung để không bị mất số 0 ở đầu */
IF EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'NguoiDung' 
      AND COLUMN_NAME = 'SDT' 
      AND DATA_TYPE = 'int'
)
BEGIN
    ALTER TABLE dbo.NguoiDung ALTER COLUMN SDT VARCHAR(20) NULL;

    -- Khôi phục số 0 ở đầu cho các số điện thoại cũ (9 chữ số)
    UPDATE dbo.NguoiDung 
    SET SDT = '0' + LTRIM(RTRIM(SDT)) 
    WHERE SDT IS NOT NULL 
      AND LEN(LTRIM(RTRIM(SDT))) = 9 
      AND SDT NOT LIKE '0%';
END;
GO
