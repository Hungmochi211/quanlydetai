import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, } from "typeorm";
import { ThanhVienDT } from "./pjmem.entity";
import { NguoiHD } from "./teacher.entity";
import { MocDeTai } from "./progress.entity";
import { TaiLieu } from "./document.entity";

@Entity('DeTai')
export class DeTai {
    @PrimaryColumn({ type: 'varchar', length: 50, nullable: false })
    MaDT!: string

    @Column({ type: 'nvarchar', length: "MAX", nullable: true })
    TenDT!: string

    @Column({ type: 'nvarchar', length: 100, nullable: true })
    ChuyenNganh!: string

    @Column({ type: 'nvarchar', length: 100, nullable: true })
    Khoa!: string

    @Column({ type: 'nvarchar', length: 100, nullable: true })
    PhanLoai!: string

    @Column({ type: 'varchar', length: 50, nullable: true })
    idNguoiHD!: string

    @Column({ type: 'nvarchar', length: 100, nullable: true })
    TrangThai!: string;
    
    @Column({ nullable: true })
    TienDo: number;

    @Column({ type: 'datetime', nullable: true })
    NgayBatDau!: Date;

    @Column({ type: 'datetime', nullable: true })
    NgayKetThuc!: Date;

    @Column({ type: 'datetime', nullable: true })
    NgayXetDuyet!: Date;

    @Column({ type: 'decimal', nullable: true })
    TongKinhPhi!: number;

    @Column({ type: 'datetime', nullable: true })
    NgayTao!: Date;

    @Column({ type: 'ntext', nullable: true })
    MoTa!: string

    @OneToMany(() => ThanhVienDT, p1 => p1.DeTai)
    ThanhVienDT!: ThanhVienDT[]

    @ManyToOne(() => NguoiHD, hd => hd.DeTai)
    @JoinColumn({ name: 'idNguoiHD' })
    NguoiHD!: NguoiHD

    @OneToMany(() => MocDeTai, (moc) => moc.deTai)
    dsMoc: MocDeTai[];

    @OneToMany(() => TaiLieu, (taiLieu) => taiLieu.deTai)
    dsTaiLieu: TaiLieu[];
}