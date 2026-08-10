import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaiLieu } from './document.entity';
import { DeTai } from './project.entity';
import { MocDeTai } from './progress.entity';
import { NguoiDung } from './user.entity';
import { PhanHoiBaoCaoTienDo } from './progress-report-review.entity';

@Entity('BaoCaoTienDo')
export class BaoCaoTienDo {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'int', nullable: true })
  MaMoc?: number;

  // Theo mốc | Định kỳ | Đột xuất
  @Column({ type: 'nvarchar', length: 30, default: 'Theo mốc' })
  LoaiBaoCao!: string;

  @Column({ type: 'nvarchar', length: 100 })
  KyBaoCao!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  NoiDungBaoCao!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  TienDoBaoCao?: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  KhoKhan?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  DeXuat?: string;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoanNguoiGui!: string;

  // Nháp | Đã gửi | Yêu cầu bổ sung | Đạt | Yêu cầu điều chỉnh | Đề xuất thanh lý
  @Column({ type: 'nvarchar', length: 30, default: 'Nháp' })
  TrangThai!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  NhanXetHoiDong?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  TaiKhoanHoiDong?: string;

  @Column({ type: 'datetime', nullable: true })
  NgayGui?: Date;

  @Column({ type: 'datetime', nullable: true })
  NgayPhanHoi?: Date;

  @CreateDateColumn({ type: 'datetime' })
  NgayTao!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  NgayCapNhat!: Date;

  @ManyToOne(() => DeTai, (deTai) => deTai.dsBaoCaoTienDo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaDT' })
  DeTai!: DeTai;

  @ManyToOne(() => MocDeTai, (moc) => moc.dsBaoCaoTienDo, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'MaMoc' })
  MocDeTai?: MocDeTai;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoanNguoiGui' })
  NguoiGui!: NguoiDung;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'TaiKhoanHoiDong' })
  NguoiHoiDong?: NguoiDung;

  @OneToMany(() => TaiLieu, (taiLieu) => taiLieu.baoCaoTienDo)
  TaiLieu!: TaiLieu[];

  @OneToMany(() => PhanHoiBaoCaoTienDo, (phanHoi) => phanHoi.BaoCaoTienDo)
  PhanHoi!: PhanHoiBaoCaoTienDo[];
}
