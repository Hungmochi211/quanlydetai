import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ChuyenNganh } from "./spec.entity";

@Entity('PhanLoai')
export class PhanLoai {
    @PrimaryGeneratedColumn()
    idPhanLoai!: number;

    @Column({ type: 'nvarchar', length: "MAX" })
    TenPhanLoai!: string;

    @Column({ type: 'varchar', length: 50, nullable: false })
    idChuyenNganh!: string

    @ManyToOne(()=> ChuyenNganh,cn=>cn.phanLoai)
    @JoinColumn({name:'idChuyenNganh'})
    chuyenNganh!: ChuyenNganh
}