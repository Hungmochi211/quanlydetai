import { Column, Entity, ManyToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { ThanhVienDT } from './pjmem.entity';
import { NguoiHD } from './teacher.entity';
import { ThongBao } from './notification.entity';

@Entity('NguoiDung')
export class NguoiDung {
  @PrimaryColumn({ type: 'varchar', length: 50, nullable: false })
  TaiKhoan!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  MatKhau!: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  TenDayDu!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: false })
  Gmail!: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  VaiTro!: string;

  @Column({ type: 'int', nullable: true })
  SDT!: number;

  @Column({ type: 'varchar', nullable: true })
  ResetToken!: string;

  @Column({ type: 'datetime', nullable: true })
  ResetTokenExpire!: Date;

  @OneToOne(() => ThanhVienDT, (tv) => tv.NguoiDung)
  ThanhVienDT!: ThanhVienDT;

  @OneToOne(() => NguoiHD, (nd) => nd.NguoiDung)
  NguoiHD!: NguoiHD;

  @ManyToMany(() => ThongBao, (tb) => tb.NguoiDung)
  ThongBao!: ThongBao;
}
