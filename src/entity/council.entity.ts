import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeTai } from './project.entity';
import { NguoiDung } from './user.entity';

@Entity('LoaiHoiDong')
export class LoaiHoiDong {
  @PrimaryGeneratedColumn()
  MaLoaiHoiDong!: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  TenLoaiHoiDong!: string;

  // approval | scoring | monitoring | liquidation | other
  // Nghiệp vụ giúp backend nhận biết luồng xử lý, tên loại vẫn do Admin tự đặt.
  @Column({ type: 'varchar', length: 30, default: 'other' })
  NghiepVu!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  MoTa?: string;

  @OneToMany(() => HoiDong, (council) => council.LoaiHoiDong)
  HoiDong!: HoiDong[];
}

@Entity('HoiDong')
export class HoiDong {
  @PrimaryGeneratedColumn()
  MaHoiDong!: number;

  @Column({ type: 'nvarchar', length: 200 })
  TenHoiDong!: string;

  @Column({ type: 'int' })
  MaLoaiHoiDong!: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  MoTa?: string;

  // Chỉ dùng một hội đồng mặc định cho mỗi nghiệp vụ tự động (ví dụ: monitoring).
  @Column({ type: 'bit', default: false })
  LaHoiDongMacDinh!: boolean;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayTao!: Date;

  @ManyToOne(() => LoaiHoiDong, (type) => type.HoiDong, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'MaLoaiHoiDong' })
  LoaiHoiDong!: LoaiHoiDong;

  @OneToMany(() => ThanhVienHoiDong, (member) => member.HoiDong)
  ThanhVienHoiDong!: ThanhVienHoiDong[];

  @OneToMany(() => HoiDongDeTai, (assignment) => assignment.HoiDong)
  HoiDongDeTai!: HoiDongDeTai[];
}

@Entity('ThanhVienHoiDong')
export class ThanhVienHoiDong {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'int' })
  MaHoiDong!: number;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoan!: string;

  // Chủ tịch | Thư ký | Ủy viên | Phản biện
  @Column({ type: 'nvarchar', length: 50, default: 'Ủy viên' })
  ChucDanh!: string;

  @ManyToOne(() => HoiDong, (council) => council.ThanhVienHoiDong, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaHoiDong' })
  HoiDong!: HoiDong;

  @ManyToOne(() => NguoiDung, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'TaiKhoan' })
  NguoiDung!: NguoiDung;
}

@Entity('HoiDongDeTai')
export class HoiDongDeTai {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'int' })
  MaHoiDong!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'int' })
  MaLoaiHoiDong!: number;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayPhanCong!: Date;

  @ManyToOne(() => HoiDong, (council) => council.HoiDongDeTai, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaHoiDong' })
  HoiDong!: HoiDong;

  @ManyToOne(() => LoaiHoiDong, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'MaLoaiHoiDong' })
  LoaiHoiDong!: LoaiHoiDong;

  @ManyToOne(() => DeTai, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'MaDT' })
  DeTai!: DeTai;
}
