import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('XetDuyetDeTai')
@Index(['MaDT', 'TaiKhoanHoiDong'], { unique: true })
export class XetDuyetDeTai {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoanHoiDong!: string;

  // Chờ phê duyệt | Đã phê duyệt | Từ chối
  @Column({ type: 'nvarchar', length: 30, default: 'Chờ phê duyệt' })
  TrangThai!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  GhiChu?: string;

  @Column({ type: 'datetime', nullable: true })
  NgayPhanHoi?: Date;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayTao!: Date;
}
