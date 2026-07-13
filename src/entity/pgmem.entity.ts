import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MocDeTai } from './progress.entity';
import { ThanhVienDT } from './pjmem.entity';

@Entity('ThanhVienMocDT')
export class ThanhVienMocDT {
  @PrimaryGeneratedColumn()
  Id: number;

  @ManyToOne(() => MocDeTai, (moc) => moc.thanhVienMocs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'MaMoc' })
  moc: MocDeTai;

  @ManyToOne(() => ThanhVienDT, (tv) => tv.thanhVienMocs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'IdTV' })
  thanhVien: ThanhVienDT;
}
