import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeTai } from 'src/entity/project.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { HoiDong, HoiDongDeTai, LoaiHoiDong, ThanhVienHoiDong } from 'src/entity/council.entity';
import { Repository } from 'typeorm';
import {
  AddCouncilMemberDto,
  AssignCouncilToProjectDto,
  CreateCouncilTypeDto,
  CreateCouncilDto,
  UpdateCouncilTypeDto,
  UpdateCouncilDto,
} from 'src/dto/CouncilDto';

@Injectable()
export class CouncilsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CouncilsService.name);
  constructor(
    @InjectRepository(HoiDong) private readonly councilRepository: Repository<HoiDong>,
    @InjectRepository(ThanhVienHoiDong) private readonly memberRepository: Repository<ThanhVienHoiDong>,
    @InjectRepository(HoiDongDeTai) private readonly assignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(LoaiHoiDong) private readonly councilTypeRepository: Repository<LoaiHoiDong>,
    @InjectRepository(NguoiDung) private readonly userRepository: Repository<NguoiDung>,
    @InjectRepository(DeTai) private readonly projectRepository: Repository<DeTai>,
  ) { }

  async onApplicationBootstrap() {
    try {
      await this.seedDefaultCouncils();
    } catch (error) {
      // Không chặn server khởi động nếu DB chưa chạy script tạo bảng hội đồng.
      this.logger.warn('Chưa thể tạo dữ liệu hội đồng mặc định. Hãy kiểm tra script database.', error);
    }
  }

  findAll(typeId?: number) {
    return this.councilRepository.find({
      where: typeId ? { MaLoaiHoiDong: typeId } : {},
      relations: ['LoaiHoiDong', 'ThanhVienHoiDong'],
      order: { MaHoiDong: 'DESC' },
    });
  }

  async findOne(id: number) {
    const council = await this.councilRepository.findOne({
      where: { MaHoiDong: id },
      relations: [
        'LoaiHoiDong',
        'ThanhVienHoiDong',
        'ThanhVienHoiDong.NguoiDung',
        'HoiDongDeTai',
        'HoiDongDeTai.DeTai',
      ],
    });
    if (!council) throw new NotFoundException('Không tìm thấy hội đồng');
    return council;
  }

  async create(dto: CreateCouncilDto) {
    await this.findType(dto.MaLoaiHoiDong);
    const council = this.councilRepository.create({
      TenHoiDong: dto.TenHoiDong.trim(),
      MaLoaiHoiDong: dto.MaLoaiHoiDong,
      MoTa: dto.MoTa?.trim() || undefined,
      LaHoiDongMacDinh: dto.LaHoiDongMacDinh ?? false,
    });
    const saved = await this.councilRepository.save(council);
    if (saved.LaHoiDongMacDinh) await this.setAsDefault(saved);
    return this.findOne(saved.MaHoiDong);
  }

  async update(id: number, dto: UpdateCouncilDto) {
    await this.findOne(id);
    if (dto.MaLoaiHoiDong !== undefined) await this.findType(dto.MaLoaiHoiDong);
    await this.councilRepository.update(
      { MaHoiDong: id },
      {
        ...(dto.TenHoiDong !== undefined ? { TenHoiDong: dto.TenHoiDong.trim() } : {}),
        ...(dto.MaLoaiHoiDong !== undefined ? { MaLoaiHoiDong: dto.MaLoaiHoiDong } : {}),
        ...(dto.MoTa !== undefined ? { MoTa: dto.MoTa.trim() || null } : {}),
        ...(dto.LaHoiDongMacDinh !== undefined ? { LaHoiDongMacDinh: dto.LaHoiDongMacDinh } : {}),
      },
    );
    const updated = await this.findOne(id);
    if (dto.LaHoiDongMacDinh) await this.setAsDefault(updated);
    return this.findOne(id);
  }

  async remove(id: number) {
    const assignmentCount = await this.assignmentRepository.count({ where: { MaHoiDong: id } });
    if (assignmentCount > 0) {
      throw new BadRequestException('Không thể xóa hội đồng đã được gán cho đề tài');
    }
    const result = await this.councilRepository.delete({ MaHoiDong: id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy hội đồng');
    return { message: 'Đã xóa hội đồng' };
  }

  async addMember(councilId: number, dto: AddCouncilMemberDto) {
    await this.findOne(councilId);
    const user = await this.userRepository.findOne({ where: { TaiKhoan: dto.TaiKhoan } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản thành viên');

    const existing = await this.memberRepository.findOne({
      where: { MaHoiDong: councilId, TaiKhoan: dto.TaiKhoan },
    });
    if (existing) throw new BadRequestException('Tài khoản đã là thành viên hội đồng');

    return this.memberRepository.save(
      this.memberRepository.create({
        MaHoiDong: councilId,
        TaiKhoan: dto.TaiKhoan,
        ChucDanh: dto.ChucDanh ?? 'Ủy viên',
      }),
    );
  }

  async removeMember(councilId: number, taiKhoan: string) {
    const result = await this.memberRepository.delete({ MaHoiDong: councilId, TaiKhoan: taiKhoan });
    if (!result.affected) throw new NotFoundException('Không tìm thấy thành viên trong hội đồng');
    return { message: 'Đã xóa thành viên khỏi hội đồng' };
  }

  async assignToProject(maDT: string, dto: AssignCouncilToProjectDto) {
    const project = await this.projectRepository.findOne({ where: { MaDT: maDT } });
    if (!project) throw new NotFoundException('Không tìm thấy đề tài');
    const council = await this.findOne(dto.MaHoiDong);
    if (council.ThanhVienHoiDong.length === 0) {
      throw new BadRequestException('Hội đồng phải có ít nhất một thành viên trước khi được gán');
    }
    const existingByType = await this.assignmentRepository.findOne({
      where: { MaDT: maDT, MaLoaiHoiDong: council.MaLoaiHoiDong },
    });
    if (existingByType) {
      throw new BadRequestException(`Đề tài đã có hội đồng loại ${council.LoaiHoiDong.TenLoaiHoiDong}`);
    }
    return this.assignmentRepository.save(
      this.assignmentRepository.create({
        MaDT: maDT,
        MaHoiDong: council.MaHoiDong,
        MaLoaiHoiDong: council.MaLoaiHoiDong,
      }),
    );
  }

  async removeProjectAssignment(maDT: string, councilId: number) {
    const result = await this.assignmentRepository.delete({ MaDT: maDT, MaHoiDong: councilId });
    if (!result.affected) throw new NotFoundException('Không tìm thấy phân công hội đồng cho đề tài');
    return { message: 'Đã gỡ hội đồng khỏi đề tài' };
  }

  findTypes() {
    return this.councilTypeRepository.find({ order: { TenLoaiHoiDong: 'ASC' } });
  }

  async createType(dto: CreateCouncilTypeDto) {
    const name = dto.TenLoaiHoiDong.trim();
    const existing = await this.councilTypeRepository.findOne({ where: { TenLoaiHoiDong: name } });
    if (existing) throw new BadRequestException('Loại hội đồng đã tồn tại');
    return this.councilTypeRepository.save(
      this.councilTypeRepository.create({
        TenLoaiHoiDong: name,
        NghiepVu: dto.NghiepVu ?? 'other',
        MoTa: dto.MoTa?.trim() || undefined,
      }),
    );
  }

  async updateType(id: number, dto: UpdateCouncilTypeDto) {
    await this.findType(id);
    if (dto.TenLoaiHoiDong !== undefined) {
      const existing = await this.councilTypeRepository.findOne({
        where: { TenLoaiHoiDong: dto.TenLoaiHoiDong.trim() },
      });
      if (existing && existing.MaLoaiHoiDong !== id) {
        throw new BadRequestException('Loại hội đồng đã tồn tại');
      }
    }
    await this.councilTypeRepository.update(
      { MaLoaiHoiDong: id },
      {
        ...(dto.TenLoaiHoiDong !== undefined ? { TenLoaiHoiDong: dto.TenLoaiHoiDong.trim() } : {}),
        ...(dto.NghiepVu !== undefined ? { NghiepVu: dto.NghiepVu } : {}),
        ...(dto.MoTa !== undefined ? { MoTa: dto.MoTa.trim() || null } : {}),
      },
    );
    return this.findType(id);
  }

  async removeType(id: number) {
    const councilCount = await this.councilRepository.count({ where: { MaLoaiHoiDong: id } });
    if (councilCount > 0) {
      throw new BadRequestException('Không thể xóa loại hội đồng đang có hội đồng sử dụng');
    }
    const result = await this.councilTypeRepository.delete({ MaLoaiHoiDong: id });
    if (!result.affected) throw new NotFoundException('Không tìm thấy loại hội đồng');
    return { message: 'Đã xóa loại hội đồng' };
  }

  async findType(id: number) {
    const type = await this.councilTypeRepository.findOne({ where: { MaLoaiHoiDong: id } });
    if (!type) throw new NotFoundException('Không tìm thấy loại hội đồng');
    return type;
  }

  private async setAsDefault(council: HoiDong): Promise<void> {
    const type = await this.findType(council.MaLoaiHoiDong);
    const typesInBusiness = await this.councilTypeRepository.find({
      where: { NghiepVu: type.NghiepVu },
    });
    const typeIds = typesInBusiness.map((item) => item.MaLoaiHoiDong);
    await this.councilRepository
      .createQueryBuilder()
      .update(HoiDong)
      .set({ LaHoiDongMacDinh: false })
      .where('MaLoaiHoiDong IN (:...typeIds)', { typeIds })
      .execute();
    await this.councilRepository.update(
      { MaHoiDong: council.MaHoiDong },
      { LaHoiDongMacDinh: true },
    );
  }

  private async seedDefaultCouncils() {
    const defaults = [
      {
        business: 'approval',
        councilName: 'Hội đồng xét duyệt',
        councilDescription: 'Xét duyệt đề cương cấp cơ sở.',
      },
      {
        business: 'monitoring',
        councilName: 'Hội đồng theo dõi',
        councilDescription: 'Theo dõi thực hiện đề tài và kiểm tra tiến độ.',
      },
      {
        business: 'scoring',
        councilName: 'Hội đồng nghiệm thu',
        councilDescription: 'Đánh giá kết quả cuối cùng, chấm điểm và xếp loại.',
      },
      {
        business: 'liquidation',
        councilName: 'Hội đồng thanh lý',
        councilDescription: 'Xử lý đề tài không đạt, quá hạn hoặc có quyết định thanh lý.',
      },
    ];

    for (const item of defaults) {
      // Chỉ dùng loại hội đồng đã có trong database; tuyệt đối không seed thêm loại mới.
      const type = await this.councilTypeRepository.findOne({
        where: { NghiepVu: item.business },
        order: { MaLoaiHoiDong: 'ASC' },
      });
      if (!type) {
        this.logger.warn(`Không seed ${item.councilName}: chưa có LoaiHoiDong nghiệp vụ ${item.business}`);
        continue;
      }

      const council = await this.councilRepository.findOne({
        where: { MaLoaiHoiDong: type.MaLoaiHoiDong },
      });
      if (!council) {
        await this.councilRepository.save(
          this.councilRepository.create({
            TenHoiDong: item.councilName,
            MaLoaiHoiDong: type.MaLoaiHoiDong,
            MoTa: item.councilDescription,
            LaHoiDongMacDinh: true,
          }),
        );
      }
    }
  }
}
