import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DeTai } from './project.entity';
import { NguoiDung } from './user.entity';

@Entity('NhanXetDeTai')
export class NhanXetDeTai {
  @PrimaryGeneratedColumn()
  Id!: number;

  @Column({ type: 'varchar', length: 50 })
  MaDT!: string;

  @Column({ type: 'varchar', length: 50 })
  TaiKhoan!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  NoiDung!: string;

  @CreateDateColumn({ type: 'datetime' })
  NgayTao!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  NgayCapNhat!: Date;

  @ManyToOne(() => DeTai)
  @JoinColumn({ name: 'MaDT' })
  DeTai!: DeTai;

  @ManyToOne(() => NguoiDung)
  @JoinColumn({ name: 'TaiKhoan' })
  NguoiDung!: NguoiDung;
}
