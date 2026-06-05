import { Column, Entity, JoinColumn, ManyToOne, ManyToMany, PrimaryGeneratedColumn, OneToOne } from "typeorm";
import { DeTai } from "./project.entity";
import { NguoiDung } from "./user.entity";

@Entity('ThanhVienDT')
export class ThanhVienDT {
    @PrimaryGeneratedColumn()
    idTV!: number;

    @Column({ type: 'varchar', length: 50 })
    MaDT!: string;

    @Column({ type: 'varchar', length: 50, nullable: false })
    TaiKhoan!: string

    @Column({ type: 'nvarchar', length: 100, nullable: false })
    VaiTroDT!: string

    @ManyToOne(() => DeTai, dt => dt.ThanhVienDT)
    @JoinColumn({ name: 'MaDT' })
    DeTai!: DeTai

    @OneToOne(()=> NguoiDung,nd => nd.ThanhVienDT)
    @JoinColumn({name: 'TaiKhoan'})
    NguoiDung!: NguoiDung
}