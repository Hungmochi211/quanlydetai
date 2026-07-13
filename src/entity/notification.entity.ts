import {
  Entity,
  Column,
  ManyToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NguoiDung } from './user.entity';

@Entity('ThongBao')
export class ThongBao {
  @PrimaryGeneratedColumn()
  idThongBao!: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  TaiKhoan!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  TkNguoiNhan!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  TieuDe!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: false })
  NoiDung!: string;

  @Column({ type: 'bit', default: 0 })
  TrangThai!: boolean;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  NgayTao!: Date;

  @ManyToMany(() => NguoiDung, (nd) => nd.ThongBao)
  @JoinColumn({ name: 'TaiKhoan' })
  NguoiDung!: NguoiDung;
}
