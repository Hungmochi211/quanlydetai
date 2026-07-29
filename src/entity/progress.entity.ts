import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DeTai } from './project.entity';
import { TaiLieu } from './document.entity';
import { ThanhVienMocDT } from './pgmem.entity';
import { BaoCaoTienDo } from './progress-report.entity';

@Entity('MocDeTai')
export class MocDeTai {
  @PrimaryGeneratedColumn()
  MaMoc: number;

  @Column({ type: 'nvarchar', length: 50 })
  MaDT: string;

  @Column({ type: 'nvarchar', length: 255 })
  TenMoc: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  MoTa: string;

  @Column()
  ThuTu: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  TrongSo: number;

  @Column({ type: 'nvarchar', nullable: true })
  GhiChu: string;

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  TrangThai: string;

  @Column({ type: 'date' })
  NgayBatDau: Date;

  @Column({ type: 'date' })
  NgayKetThuc: Date;

  @CreateDateColumn({ type: 'datetime' })
  NgayTao: Date;

  @UpdateDateColumn({ type: 'datetime' })
  NgayCapNhat: Date;

  @ManyToOne(() => DeTai, (deTai) => deTai.dsMoc, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MaDT' })
  deTai: DeTai;

  @OneToMany(() => TaiLieu, (taiLieu) => taiLieu.mocDeTai)
  dsTaiLieu: TaiLieu[];

  @OneToMany(() => ThanhVienMocDT, (thanhVienMoc) => thanhVienMoc.moc)
  thanhVienMocs: ThanhVienMocDT[];

  @OneToMany(() => BaoCaoTienDo, (baoCao) => baoCao.MocDeTai)
  dsBaoCaoTienDo: BaoCaoTienDo[];
}
