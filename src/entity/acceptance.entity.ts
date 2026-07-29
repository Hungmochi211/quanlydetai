import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaiLieu } from './document.entity';
import { DeTai } from './project.entity';
import { NguoiDung } from './user.entity';

@Entity('HoSoNghiemThu')
export class HoSoNghiemThu {
  @PrimaryGeneratedColumn() Id!: number;
  @Column({ type: 'varchar', length: 50 }) MaDT!: string;
  @Column({ type: 'varchar', length: 50 }) TaiKhoanNguoiGui!: string;
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) GhiChu?: string;
  // Nháp | Đã gửi | Đang chấm | Yêu cầu bổ sung | Đã chốt | Không đạt
  @Column({ type: 'nvarchar', length: 30, default: 'Nháp' }) TrangThai!: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  DiemTrungBinh?: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  DiemCuoiCung?: number;
  @Column({ type: 'nvarchar', length: 100, nullable: true }) ChatLuong?: string;
  @Column({ type: 'nvarchar', length: 30, nullable: true })
  KetQuaCuoiCung?: string;
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  NhanXetChuTich?: string;
  @Column({ type: 'varchar', length: 50, nullable: true })
  TaiKhoanChuTichChot?: string;
  @Column({ type: 'datetime', nullable: true }) NgayGui?: Date;
  @Column({ type: 'datetime', nullable: true }) NgayChot?: Date;
  @CreateDateColumn({ type: 'datetime' }) NgayTao!: Date;
  @UpdateDateColumn({ type: 'datetime' }) NgayCapNhat!: Date;
  @ManyToOne(() => DeTai, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaDT' })
  DeTai!: DeTai;
  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoanNguoiGui' })
  NguoiGui!: NguoiDung;
  @OneToMany(() => PhieuChamNghiemThu, (score) => score.HoSoNghiemThu)
  PhieuCham!: PhieuChamNghiemThu[];
  @OneToMany(() => TaiLieu, (document) => document.HoSoNghiemThu)
  TaiLieu!: TaiLieu[];
}

@Entity('PhieuChamNghiemThu')
export class PhieuChamNghiemThu {
  @PrimaryGeneratedColumn() Id!: number;
  @Column({ type: 'int' }) MaHoSoNghiemThu!: number;
  @Column({ type: 'varchar', length: 50 }) TaiKhoanHoiDong!: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  Diem?: number;
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) NhanXet?: string;
  @Column({ type: 'nvarchar', length: 30, default: 'Nháp' }) TrangThai!: string;
  @Column({ type: 'datetime', nullable: true }) NgayGui?: Date;
  @UpdateDateColumn({ type: 'datetime' }) NgayCapNhat!: Date;
  @ManyToOne(() => HoSoNghiemThu, (dossier) => dossier.PhieuCham, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'MaHoSoNghiemThu' })
  HoSoNghiemThu!: HoSoNghiemThu;
  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoanHoiDong' })
  NguoiHoiDong!: NguoiDung;
}
