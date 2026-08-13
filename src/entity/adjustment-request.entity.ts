import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DeTai } from './project.entity';
import { NguoiDung } from './user.entity';
import { TaiLieu } from './document.entity';

@Entity('YeuCauDieuChinhDeTai')
export class YeuCauDieuChinhDeTai {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoanNguoiGui!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  TaiKhoanNguoiXuLy?: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  NhomDieuChinh!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  ThongTinHienTai!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  NoiDungDeNghi!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  LyDo!: string;

  // Chờ duyệt | Đã chấp nhận | Từ chối
  @Column({ type: 'nvarchar', length: 30, default: 'Chờ duyệt' })
  TrangThai!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  LyDoTuChoi?: string;

  @Column({ type: 'int', nullable: true })
  YeuCauGocId?: number;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayGui!: Date;

  @Column({ type: 'datetime', nullable: true })
  NgayXuLy?: Date;

  @Column({ type: 'bit', default: false })
  DaApDung!: boolean;

  @Column({ type: 'datetime', nullable: true })
  NgayApDung?: Date;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  NoiDungDaApDung?: string;

  @ManyToOne(() => DeTai, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'MaDT' })
  DeTai!: DeTai;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoanNguoiGui' })
  NguoiGui!: NguoiDung;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'TaiKhoanNguoiXuLy' })
  NguoiXuLy?: NguoiDung;

  @OneToMany(() => TaiLieu, (document) => document.YeuCauDieuChinh)
  TaiLieu?: TaiLieu[];
}
