import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { DeTai } from './project.entity';
import { NguoiDung } from './user.entity';
import { ChuyenNganh } from './spec.entity';

@Entity('NguoiHD')
export class NguoiHD {
  @PrimaryColumn({ type: 'varchar', length: 50, nullable: false })
  idNguoiHD!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  TaiKhoan!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  HocHamHocVi!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  idChuyenNganh!: string;

  @OneToMany(() => DeTai, (dt) => dt.NguoiHD)
  DeTai!: DeTai[];

  @OneToOne(() => NguoiDung, (nd) => nd.NguoiHD)
  @JoinColumn({ name: 'TaiKhoan' })
  NguoiDung!: NguoiDung;

  @ManyToOne(() => ChuyenNganh, (cn) => cn.NguoiHD)
  @JoinColumn({ name: 'idChuyenNganh' })
  ChuyenNganh!: ChuyenNganh;
}
