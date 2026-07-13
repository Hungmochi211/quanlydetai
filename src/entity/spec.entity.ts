import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { PhanLoai } from './speclist.entity';
import { NguoiHD } from './teacher.entity';

@Entity('ChuyenNganh')
export class ChuyenNganh {
  @PrimaryColumn({ type: 'varchar', length: 50, nullable: false })
  idChuyenNganh!: string;

  @Column({ type: 'varchar', length: 'MAX', nullable: true })
  TenChuyenNganh!: string;

  @OneToMany(() => PhanLoai, (p1) => p1.chuyenNganh)
  phanLoai!: PhanLoai[];

  @OneToMany(() => NguoiHD, (hd) => hd.ChuyenNganh)
  NguoiHD!: NguoiHD[];
}
