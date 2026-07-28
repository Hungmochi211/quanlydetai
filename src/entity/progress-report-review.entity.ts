import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaoCaoTienDo } from './progress-report.entity';
import { NguoiDung } from './user.entity';

/** Lưu vết mọi lần hội đồng phản hồi để không mất lịch sử khi báo cáo được gửi lại. */
@Entity('PhanHoiBaoCaoTienDo')
export class PhanHoiBaoCaoTienDo {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'int' })
  MaBaoCaoTienDo!: number;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoanHoiDong!: string;

  @Column({ type: 'nvarchar', length: 30 })
  KetQua!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  NhanXet!: string;

  @CreateDateColumn({ type: 'datetime' })
  NgayPhanHoi!: Date;

  @ManyToOne(() => BaoCaoTienDo, (report) => report.PhanHoi, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaBaoCaoTienDo' })
  BaoCaoTienDo!: BaoCaoTienDo;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoanHoiDong' })
  NguoiHoiDong!: NguoiDung;
}
