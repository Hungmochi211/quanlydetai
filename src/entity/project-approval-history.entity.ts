import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Lưu các vòng xét duyệt đã kết thúc khi nhóm trưởng gửi lại đề tài bị từ chối.
 * Bảng XetDuyetDeTai chỉ chứa vòng xét duyệt đang có hiệu lực.
 */
@Entity('LichSuXetDuyetDeTai')
@Index(['MaDT', 'LanXetDuyet'])
export class LichSuXetDuyetDeTai {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'int' })
  LanXetDuyet!: number;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoanHoiDong!: string;

  @Column({ type: 'int', nullable: true })
  MaHoiDong?: number;

  @Column({ type: 'nvarchar', length: 30, default: 'Xét duyệt' })
  LoaiHoiDong!: string;

  @Column({ type: 'nvarchar', length: 30 })
  TrangThai!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  GhiChu?: string;

  @Column({ type: 'datetime', nullable: true })
  NgayTao?: Date;

  @Column({ type: 'datetime', nullable: true })
  NgayPhanHoi?: Date;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayLuu!: Date;
}
