import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, } from 'typeorm';
import { DeTai } from './project.entity';
import { MocDeTai } from './progress.entity';

@Entity('TaiLieu')
export class TaiLieu {
    @PrimaryGeneratedColumn()
    MaTL: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    MaDT: string;

    @Column({nullable: true})
    MaMoc: number;

    @Column({ type: 'nvarchar', length: 255 })
    TenFile: string;

    @Column({ type: 'nvarchar', length: 500 })
    FilePath: string;

    @Column({ type: 'nvarchar', length: 255 })
    NguoiGui: string;

    @Column({ type: 'varchar', length: 50, nullable: true, })
    LoaiTaiLieu: string;

    @CreateDateColumn({ type: 'datetime', })
    NgayTaiLen: Date;

    @UpdateDateColumn({ type: 'datetime', })
    NgayCapNhat: Date;

    @ManyToOne(() => DeTai, (deTai) => deTai.dsTaiLieu, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'MaDT' })
    deTai: DeTai;

    @ManyToOne(() => MocDeTai, (moc) => moc.dsTaiLieu)
    @JoinColumn({ name: 'MaMoc' })
    mocDeTai: MocDeTai;
}