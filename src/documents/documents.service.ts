import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, promises as fs } from 'fs';
import { basename, join } from 'path';
import { AddTaiLieuDto } from 'src/dto/addTaiLieuDto';
import { TaiLieu } from 'src/entity/document.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { MocDeTai } from 'src/entity/progress.entity';
import { XetDuyetDeTai } from 'src/entity/project-approval.entity';
import { BaoCaoTienDo } from 'src/entity/progress-report.entity';
import { HoSoNghiemThu } from 'src/entity/acceptance.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { NguoiDung } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(TaiLieu)
    private readonly taiLieuRepository: Repository<TaiLieu>,
    @InjectRepository(ThanhVienDT)
    private readonly thanhVienRepository: Repository<ThanhVienDT>,
    @InjectRepository(MocDeTai)
    private readonly mocRepository: Repository<MocDeTai>,

    @InjectRepository(XetDuyetDeTai)
    private readonly approvalRepository: Repository<XetDuyetDeTai>,
    @InjectRepository(BaoCaoTienDo)
    private readonly reportRepository: Repository<BaoCaoTienDo>,
    @InjectRepository(HoSoNghiemThu)
    private readonly acceptanceDossierRepository: Repository<HoSoNghiemThu>,
    @InjectRepository(HoiDongDeTai)
    private readonly councilAssignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(ThanhVienHoiDong)
    private readonly councilMemberRepository: Repository<ThanhVienHoiDong>,
    @InjectRepository(NguoiDung)
    private readonly userRepository: Repository<NguoiDung>,
  ) { }

  async upload(
    dto: AddTaiLieuDto,
    file: Express.Multer.File,
    taiKhoan: string,
  ): Promise<TaiLieu> {
    const maDT = dto.MaDT?.trim();
    if (!maDT) {
      throw new BadRequestException('Mã đề tài là bắt buộc');
    }

    await this.getMemberOrThrow(maDT, taiKhoan);

    const maMoc = await this.validateMilestone(dto.MaMoc, maDT);
    const maBaoCaoTienDo = await this.validateProgressReport(
      dto.MaBaoCaoTienDo,
      maDT,
      taiKhoan,
    );
    const maHoSoNghiemThu = await this.validateAcceptanceDossier(
      dto.MaHoSoNghiemThu,
      maDT,
      taiKhoan,
    );

    const attachmentTargets = [maMoc, maBaoCaoTienDo, maHoSoNghiemThu]
      .filter((value) => value !== undefined);
    if (attachmentTargets.length > 1) {
      throw new BadRequestException(
        'Một tài liệu chỉ được đính kèm cho một mốc, báo cáo hoặc hồ sơ nghiệm thu',
      );
    }

    // Nếu mốc đã có tài liệu thì thay thế
    if (maMoc && !maBaoCaoTienDo) {
      const oldDocument = await this.taiLieuRepository.findOne({
        where: { MaMoc: maMoc },
      });

      if (oldDocument) {
        await this.taiLieuRepository.remove(oldDocument);

        await fs
          .unlink(this.getPhysicalPathForDocument(oldDocument))
          .catch(() => undefined);
      }
    }

    const taiLieu = this.taiLieuRepository.create({
      MaDT: maDT,
      MaMoc: maMoc,
      MaBaoCaoTienDo: maBaoCaoTienDo,
      MaHoSoNghiemThu: maHoSoNghiemThu,
      NguoiGui: taiKhoan,
      LoaiTaiLieu: dto.LoaiTaiLieu?.trim(),
      TenFile: this.normalizeUploadedFileName(file.originalname),
      FilePath: file.filename,
    });

    try {
      return await this.taiLieuRepository.save(taiLieu);
    } catch (error) {
      await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async findOne(id: number, taiKhoan: string): Promise<TaiLieu> {
    const taiLieu = await this.findOneById(id);
    await this.ensureCanViewProject(taiLieu.MaDT, taiKhoan);
    return taiLieu;
  }

  async getPhysicalPath(
    id: number,
    taiKhoan: string,
  ): Promise<{ path: string; tenFile: string }> {
    const taiLieu = await this.findOne(id, taiKhoan);
    const physicalPath = this.getPhysicalPathForDocument(taiLieu);

    if (!existsSync(physicalPath)) {
      throw new NotFoundException('File không tồn tại trên server');
    }

    return { path: physicalPath, tenFile: taiLieu.TenFile };
  }

  async findByDeTai(maDT: string, taiKhoan: string): Promise<TaiLieu[]> {
    await this.ensureCanViewProject(maDT, taiKhoan);
    return this.taiLieuRepository.find({
      where: { MaDT: maDT },
      order: { NgayTaiLen: 'DESC' },
    });
  }

  async findByMoc(maMoc: number, taiKhoan: string): Promise<TaiLieu[]> {
    const moc = await this.mocRepository.findOne({ where: { MaMoc: maMoc } });
    if (!moc) {
      throw new NotFoundException(`Không tìm thấy mốc với id = ${maMoc}`);
    }

    await this.ensureCanViewProject(moc.MaDT, taiKhoan);
    return this.taiLieuRepository.find({
      where: { MaMoc: maMoc },
      order: { NgayTaiLen: 'DESC' },
    });
  }

  async findByProgressReport(reportId: number, taiKhoan: string): Promise<TaiLieu[]> {
    const report = await this.reportRepository.findOne({ where: { Id: reportId } });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo tiến độ với id = ${reportId}`);
    }
    await this.ensureCanViewProject(report.MaDT, taiKhoan);
    return this.taiLieuRepository.find({
      where: { MaBaoCaoTienDo: reportId },
      order: { NgayTaiLen: 'DESC' },
    });
  }

  async remove(id: number, taiKhoan: string): Promise<void> {
    const taiLieu = await this.findOneById(id);

    // Chỉ kiểm tra người này có thuộc đề tài hay không
    const member = await this.getMemberOrThrow(taiLieu.MaDT, taiKhoan);
    if (taiLieu.MaBaoCaoTienDo) {
      const report = await this.reportRepository.findOne({ where: { Id: taiLieu.MaBaoCaoTienDo } });
      if (!report || report.TaiKhoanNguoiGui !== taiKhoan || !['Nháp', 'Yêu cầu bổ sung'].includes(report.TrangThai)) {
        throw new ForbiddenException('Chỉ được xóa tài liệu của báo cáo đang được chỉnh sửa');
      }
      if (!this.normalizeRole(member.VaiTroDT).includes('nhom truong')) {
        throw new ForbiddenException('Chỉ nhóm trưởng được xóa tài liệu báo cáo tiến độ');
      }
    }

    await this.taiLieuRepository.remove(taiLieu);

    await fs.unlink(this.getPhysicalPathForDocument(taiLieu)).catch(() => undefined);
  }

  private async findOneById(id: number): Promise<TaiLieu> {
    const taiLieu = await this.taiLieuRepository.findOne({
      where: { MaTL: id },
    });
    if (!taiLieu) {
      throw new NotFoundException(`Không tìm thấy tài liệu với id = ${id}`);
    }
    return taiLieu;
  }

  private async getMemberOrThrow(
    maDT: string,
    taiKhoan: string,
  ): Promise<ThanhVienDT> {
    const thanhVien = await this.thanhVienRepository.findOne({
      where: { MaDT: maDT, TaiKhoan: taiKhoan },
    });
    if (!thanhVien) {
      throw new ForbiddenException('Bạn không thuộc đề tài này');
    }
    return thanhVien;
  }

  private async ensureCanViewProject(maDT: string, taiKhoan: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { TaiKhoan: taiKhoan } });
    const normalizedRole = this.normalizeRole(user?.VaiTro || '');
    if (normalizedRole === 'admin' || normalizedRole === 'quan tri') {
      return;
    }

    const thanhVien = await this.thanhVienRepository.findOne({
      where: { MaDT: maDT, TaiKhoan: taiKhoan },
    });
    if (thanhVien) return;

    const approval = await this.approvalRepository.findOne({
      where: { MaDT: maDT, TaiKhoanHoiDong: taiKhoan },
    });
    if (approval) return;

    const assignments = await this.councilAssignmentRepository.find({
      where: { MaDT: maDT },
      relations: ['LoaiHoiDong'],
    });
    // Thành viên của mọi hội đồng đã được gán cho đề tài (theo dõi, chấm điểm,
    // nghiệm thu...) đều cần xem được tài liệu để thực hiện nghiệp vụ của mình.
    const assignedCouncilIds = assignments.map((assignment) => assignment.MaHoiDong);
    if (assignedCouncilIds.length > 0) {
      const councilMember = await this.councilMemberRepository
        .createQueryBuilder('member')
        .where('member.TaiKhoan = :taiKhoan', { taiKhoan })
        .andWhere('member.MaHoiDong IN (:...ids)', { ids: assignedCouncilIds })
        .getOne();
      if (councilMember) return;
    }
    throw new ForbiddenException('Bạn không có quyền xem tài liệu của đề tài này');
  }

  private async validateMilestone(
    rawMaMoc: number | string | undefined,
    maDT: string,
  ): Promise<number | undefined> {
    if (rawMaMoc === undefined || rawMaMoc === null || rawMaMoc === '') {
      return undefined;
    }

    const maMoc = Number(rawMaMoc);
    if (!Number.isInteger(maMoc)) {
      throw new BadRequestException('Mã mốc không hợp lệ');
    }

    const moc = await this.mocRepository.findOne({ where: { MaMoc: maMoc } });
    if (!moc || moc.MaDT !== maDT) {
      throw new BadRequestException('Mốc tiến độ không thuộc đề tài này');
    }
    return maMoc;
  }

  async removeByMilestone(maMoc: number): Promise<void> {
    const documents = await this.taiLieuRepository.find({
      where: { MaMoc: maMoc },
    });

    for (const document of documents) {
      await fs
        .unlink(this.getPhysicalPathForDocument(document))
        .catch(() => undefined);

      await this.taiLieuRepository.remove(document);
    }
  }

  async removeByProgressReport(reportId: number): Promise<void> {
    const documents = await this.taiLieuRepository.find({
      where: { MaBaoCaoTienDo: reportId },
    });
    for (const document of documents) {
      await fs.unlink(this.getPhysicalPathForDocument(document)).catch(() => undefined);
      await this.taiLieuRepository.remove(document);
    }
  }

  private async validateProgressReport(
    rawReportId: number | string | undefined,
    maDT: string,
    taiKhoan: string,
  ): Promise<number | undefined> {
    if (rawReportId === undefined || rawReportId === null || rawReportId === '') return undefined;
    const reportId = Number(rawReportId);
    if (!Number.isInteger(reportId)) throw new BadRequestException('Mã báo cáo tiến độ không hợp lệ');
    const report = await this.reportRepository.findOne({ where: { Id: reportId } });
    if (!report || report.MaDT !== maDT) {
      throw new BadRequestException('Báo cáo tiến độ không thuộc đề tài này');
    }
    const member = await this.getMemberOrThrow(maDT, taiKhoan);
    if (report.TaiKhoanNguoiGui !== taiKhoan || !this.normalizeRole(member.VaiTroDT).includes('nhom truong')) {
      throw new ForbiddenException('Chỉ nhóm trưởng tạo báo cáo mới được đính kèm minh chứng');
    }
    if (!['Nháp', 'Yêu cầu bổ sung'].includes(report.TrangThai)) {
      throw new BadRequestException('Chỉ được thêm tài liệu khi báo cáo ở trạng thái Nháp hoặc Yêu cầu bổ sung');
    }
    return reportId;
  }

  private async validateAcceptanceDossier(
    rawDossierId: number | string | undefined,
    maDT: string,
    taiKhoan: string,
  ): Promise<number | undefined> {
    if (rawDossierId === undefined || rawDossierId === null || rawDossierId === '') {
      return undefined;
    }

    const dossierId = Number(rawDossierId);
    if (!Number.isInteger(dossierId)) {
      throw new BadRequestException('Mã hồ sơ nghiệm thu không hợp lệ');
    }

    const dossier = await this.acceptanceDossierRepository.findOne({
      where: { Id: dossierId },
    });
    if (!dossier || dossier.MaDT !== maDT) {
      throw new BadRequestException('Hồ sơ nghiệm thu không thuộc đề tài này');
    }
    if (dossier.TaiKhoanNguoiGui !== taiKhoan) {
      throw new ForbiddenException(
        'Chỉ nhóm trưởng tạo hồ sơ mới được đính kèm tài liệu nghiệm thu',
      );
    }
    if (!['Nháp', 'Yêu cầu bổ sung'].includes(dossier.TrangThai)) {
      throw new BadRequestException(
        'Chỉ được thêm tài liệu khi hồ sơ nghiệm thu ở trạng thái Nháp hoặc Yêu cầu bổ sung',
      );
    }

    return dossierId;
  }

  private getPhysicalPathForDocument(taiLieu: TaiLieu): string {
    const fileName = basename(taiLieu.FilePath);
    const isLegacyPublicFile = taiLieu.FilePath.includes('uploads/documents');
    const directory = isLegacyPublicFile
      ? join('uploads', 'documents')
      : join('private-uploads', 'documents');
    return join(process.cwd(), directory, fileName);
  }

  /**
   * Multer có thể trả về tên file UTF-8 đã bị đọc nhầm theo Latin-1,
   * ví dụ "báº£n cam káº¿t" thay vì "bản cam kết".
   */
  private normalizeUploadedFileName(fileName: string): string {
    const hasMojibake = /Ã.|Ä.|Â.|áº|á»|â€/.test(fileName);
    if (!hasMojibake) {
      return fileName;
    }

    const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? fileName : decoded;
  }

  private normalizeRole(role: string): string {
    return role
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
