import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { StatisticsExportQueryDto, StatisticsQueryDto } from 'src/dto/StatisticsDto';
import { DeTai } from 'src/entity/project.entity';
import { ThanhVienDT } from 'src/entity/pjmem.entity';
import { PhanLoai } from 'src/entity/speclist.entity';
import { HoiDongDeTai, ThanhVienHoiDong } from 'src/entity/council.entity';
import { MocDeTai } from 'src/entity/progress.entity';

type ReportTopic = Pick<DeTai, 'MaDT' | 'TenDT' | 'Khoa' | 'TrangThai' | 'TienDo' | 'NgayKetThuc'>;

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(DeTai) private readonly projectRepository: Repository<DeTai>,
    @InjectRepository(ThanhVienDT) private readonly memberRepository: Repository<ThanhVienDT>,
    @InjectRepository(PhanLoai) private readonly facultyRepository: Repository<PhanLoai>,
    @InjectRepository(ThanhVienHoiDong) private readonly councilMemberRepository: Repository<ThanhVienHoiDong>,
    @InjectRepository(HoiDongDeTai) private readonly councilAssignmentRepository: Repository<HoiDongDeTai>,
    @InjectRepository(MocDeTai) private readonly milestoneRepository: Repository<MocDeTai>,
  ) {}

  private applyFilters(builder: SelectQueryBuilder<DeTai>, query: StatisticsQueryDto) {
    if (query.departmentId?.trim()) builder.andWhere('project.Khoa = :department', { department: query.departmentId.trim() });
    if (query.academicYear?.trim()) {
      const startYear = Number(query.academicYear.slice(0, 4));
      if (Number.isInteger(startYear)) builder.andWhere('YEAR(project.NgayTao) = :startYear', { startYear });
    }
    return builder;
  }

  private async getTopics(query: StatisticsQueryDto): Promise<ReportTopic[]> {
    const builder = this.projectRepository.createQueryBuilder('project').select([
      'project.MaDT', 'project.TenDT', 'project.Khoa', 'project.TrangThai', 'project.TienDo', 'project.NgayKetThuc', 'project.NgayTao',
    ]);
    const topics = await this.applyFilters(builder, query).orderBy('project.NgayTao', 'DESC').getMany();
    return this.withFacultyNames(topics);
  }

  private async withFacultyNames<T extends Pick<DeTai, 'Khoa'>>(topics: T[]): Promise<T[]> {
    const ids = [...new Set(topics
      .map((topic) => Number(topic.Khoa))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return topics;
    const faculties = await this.facultyRepository.findBy({ idPhanLoai: In(ids) });
    const names = new Map(faculties.map((faculty): [string, string] => [String(faculty.idPhanLoai), faculty.TenPhanLoai]));
    return topics.map((topic) => ({ ...topic, Khoa: names.get(String(topic.Khoa)) || topic.Khoa }));
  }

  private isCompleted(topic: ReportTopic) {
    const status = (topic.TrangThai || '').toLocaleLowerCase('vi-VN');
    return status.includes('hoàn thành') || status.includes('nghiệm thu');
  }

  private buildReportData(topics: ReportTopic[]) {
    const now = new Date();
    const completed = topics.filter((topic) => this.isCompleted(topic));
    const overdue = topics.filter((topic) => !this.isCompleted(topic) && topic.NgayKetThuc && new Date(topic.NgayKetThuc) < now);
    const inProgress = topics.filter((topic) => !this.isCompleted(topic) && !overdue.includes(topic));
    const byDepartmentMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    topics.forEach((topic) => {
      const department = topic.Khoa || 'Chưa phân khoa';
      byDepartmentMap.set(department, (byDepartmentMap.get(department) || 0) + 1);
      const date = (topic as DeTai).NgayTao;
      if (date) {
        const month = new Date(date).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      }
    });
    return {
      overview: { totalTopics: topics.length, inProgress: inProgress.length, completed: completed.length, overdue: overdue.length },
      overdueTopics: overdue.map((topic) => ({ id: topic.MaDT, topicName: topic.TenDT, owner: '', daysOverdue: Math.ceil((now.getTime() - new Date(topic.NgayKetThuc).getTime()) / 86_400_000) })),
      byDepartment: [...byDepartmentMap].map(([departmentName, count]) => ({ departmentName, count })),
      monthlyTrend: [...monthlyMap].map(([month, count]) => ({ month, count })),
      budget: { totalBudget: 0, disbursed: 0 },
      topics,
    };
  }

  private async reportData(query: StatisticsQueryDto) {
    return this.buildReportData(await this.getTopics(query));
  }

  private async getMyTopics(account: string): Promise<DeTai[]> {
    const memberTopics = await this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.DeTai', 'project')
      .where('member.TaiKhoan = :account', { account })
      .getMany();
    const advisorTopics = await this.projectRepository.createQueryBuilder('project')
      .leftJoin('project.NguoiHD', 'advisor')
      .where('advisor.TaiKhoan = :account', { account })
      .getMany();
    return [...new Map([...memberTopics.map((item) => item.DeTai), ...advisorTopics]
      .filter(Boolean)
      .map((topic) => [topic.MaDT, topic])).values()];
  }

  async getOverview(query: StatisticsQueryDto) {
    const { topics: _topics, ...overview } = await this.reportData(query);
    return overview;
  }

  async getMyTopicStatistics(account: string) {
    const topics = await this.withFacultyNames(await this.getMyTopics(account));
    const now = new Date();
    const topicCodes = topics.map((topic) => topic.MaDT);
    const milestoneRecords = topicCodes.length
      ? await this.milestoneRepository.find({
          where: { MaDT: In(topicCodes) },
          order: { ThuTu: 'ASC', MaMoc: 'ASC' },
        })
      : [];
    const milestonesByTopic = new Map<string, MocDeTai[]>();
    milestoneRecords.forEach((milestone) => {
      const list = milestonesByTopic.get(milestone.MaDT) || [];
      list.push(milestone);
      milestonesByTopic.set(milestone.MaDT, list);
    });
    const getMilestoneStatus = (milestone: MocDeTai): 'completed' | 'in_progress' | 'upcoming' | 'not_started' => {
      const status = this.normalizeMilestoneStatus(milestone.TrangThai);
      if (status.includes('hoan thanh')) return 'completed';
      if (status.includes('dang thuc hien')) return 'in_progress';
      if (status.includes('chua bat dau')) return 'not_started';
      return 'upcoming';
    };
    const myTopics = topics.map((topic) => {
      const completed = this.isCompleted(topic);
      const overdue = !completed && topic.NgayKetThuc && new Date(topic.NgayKetThuc) < now;
      const milestones = (milestonesByTopic.get(topic.MaDT) || []).map((milestone) => ({
        name: milestone.TenMoc,
        status: getMilestoneStatus(milestone),
        deadline: new Date(milestone.NgayKetThuc).toISOString(),
      }));
      const nextMilestone = (milestonesByTopic.get(topic.MaDT) || []).find(
        (milestone) => getMilestoneStatus(milestone) !== 'completed',
      );
      return {
        id: topic.MaDT,
        topicName: topic.TenDT,
        status: completed ? 'completed' : overdue ? 'overdue' : 'in_progress',
        milestones,
        nextDeadline: nextMilestone?.NgayKetThuc || topic.NgayKetThuc || null,
      };
    });
    const todoItems = myTopics.filter((topic) => topic.status === 'overdue' || (topic.nextDeadline && new Date(topic.nextDeadline).getTime() - now.getTime() < 7 * 86_400_000)).map((topic) => ({
      id: topic.id,
      content: topic.topicName,
      level: topic.status === 'overdue' ? 'overdue' : 'upcoming',
      days: Math.abs(Math.ceil((new Date(topic.nextDeadline || now).getTime() - now.getTime()) / 86_400_000)),
    }));
    return { todoItems, myTopics };
  }

  private normalizeMilestoneStatus(status?: string) {
    return (status || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim();
  }

  async exportMyTopicsReport(account: string, query: StatisticsExportQueryDto) {
    const report = this.buildReportData(await this.withFacultyNames(await this.getMyTopics(account)));
    if (query.format === 'excel') return this.exportExcel(report);
    if (query.format === 'pdf') return this.exportPdf(report);
    return this.exportDocx(report);
  }

  async exportReport(query: StatisticsExportQueryDto) {
    const report = await this.reportData(query);
    if (query.format === 'excel') return this.exportExcel(report);
    if (query.format === 'pdf') return this.exportPdf(report);
    return this.exportDocx(report);
  }

  private async exportExcel(report: Awaited<ReturnType<StatisticsService['reportData']>>) {
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet('Tổng quan');
    summary.addRow(['BÁO CÁO THỐNG KÊ ĐỀ TÀI']);
    summary.mergeCells('A1:B1');
    summary.getCell('A1').font = { bold: true, size: 16 };
    summary.addRows([['Tổng đề tài', report.overview.totalTopics], ['Đang thực hiện', report.overview.inProgress], ['Hoàn thành', report.overview.completed], ['Trễ hạn', report.overview.overdue]]);
    summary.columns = [{ width: 24 }, { width: 18 }];
    const list = workbook.addWorksheet('Danh sách đề tài');
    list.columns = [{ header: 'Mã đề tài', key: 'code', width: 18 }, { header: 'Tên đề tài', key: 'name', width: 45 }, { header: 'Khoa', key: 'department', width: 24 }, { header: 'Trạng thái', key: 'status', width: 20 }, { header: 'Tiến độ', key: 'progress', width: 12 }, { header: 'Hạn kết thúc', key: 'deadline', width: 16 }];
    list.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    list.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6E3C' } };
    report.topics.forEach((topic) => list.addRow({ code: topic.MaDT, name: topic.TenDT, department: topic.Khoa, status: topic.TrangThai, progress: `${topic.TienDo || 0}%`, deadline: topic.NgayKetThuc ? new Date(topic.NgayKetThuc).toLocaleDateString('vi-VN') : '' }));
    return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: 'bao-cao-thong-ke.xlsx' };
  }

  private exportPdf(report: Awaited<ReturnType<StatisticsService['reportData']>>) {
    return new Promise<{ buffer: Buffer; contentType: string; fileName: string }>((resolve) => {
      const document = new PDFDocument({ margin: 40 }); const chunks: Buffer[] = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: 'application/pdf', fileName: 'bao-cao-thong-ke.pdf' }));
      const fontPath = process.env.PDF_FONT_PATH || (process.platform === 'win32' ? 'C:\\Windows\\Fonts\\arial.ttf' : '');
      if (fontPath && existsSync(fontPath)) document.font(fontPath);
      document.fontSize(18).text('BÁO CÁO THỐNG KÊ ĐỀ TÀI', { align: 'center' }).moveDown();
      document.fontSize(11).text(`Tổng đề tài: ${report.overview.totalTopics} | Đang thực hiện: ${report.overview.inProgress} | Hoàn thành: ${report.overview.completed} | Trễ hạn: ${report.overview.overdue}`).moveDown();
      report.topics.forEach((topic) => document.text(`${topic.MaDT} | ${topic.TenDT} | ${topic.TrangThai} | ${topic.TienDo || 0}%`));
      document.end();
    });
  }

  private async exportDocx(report: Awaited<ReturnType<StatisticsService['reportData']>>) {
    const header = ['Mã đề tài', 'Tên đề tài', 'Khoa', 'Trạng thái', 'Tiến độ'];
    const table = new Table({ rows: [new TableRow({ children: header.map((value) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold: true })] })] })) }), ...report.topics.map((topic) => new TableRow({ children: [topic.MaDT, topic.TenDT, topic.Khoa || '', topic.TrangThai || '', `${topic.TienDo || 0}%`].map((value) => new TableCell({ children: [new Paragraph(value)] })) }))] });
    const document = new Document({ sections: [{ children: [new Paragraph({ text: 'BÁO CÁO THỐNG KÊ ĐỀ TÀI', heading: HeadingLevel.TITLE }), new Paragraph(`Tổng đề tài: ${report.overview.totalTopics} | Đang thực hiện: ${report.overview.inProgress} | Hoàn thành: ${report.overview.completed} | Trễ hạn: ${report.overview.overdue}`), table] }] });
    return { buffer: Buffer.from(await Packer.toBuffer(document)), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName: 'bao-cao-thong-ke.docx' };
  }

  async getCouncilTopicStatistics(account: string) {
    const councilMembers = await this.councilMemberRepository.find({
      where: { TaiKhoan: account },
    });
    const councilIds = councilMembers.map((m) => m.MaHoiDong);
    if (!councilIds.length) {
      return {
        overview: { totalTopics: 0, pending: 0, approved: 0 },
        topics: [],
      };
    }

    const assignments = await this.councilAssignmentRepository.find({
      where: { MaHoiDong: In(councilIds) },
      relations: ['DeTai', 'HoiDong', 'LoaiHoiDong', 'HoiDong.LoaiHoiDong'],
    });

    const uniqueAssignments = [
      ...new Map(
        assignments
          .filter((a) => a.DeTai)
          .map((a) => [a.MaDT, a]),
      ).values(),
    ];

    const topics = uniqueAssignments.map((assignment) => {
      const project = assignment.DeTai;
      const statusNormalized = (project.TrangThai || '').toLowerCase();
      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      if (
        statusNormalized.includes('từ chối') ||
        statusNormalized.includes('không đạt') ||
        statusNormalized.includes('hủy')
      ) {
        status = 'rejected';
      } else if (
        statusNormalized.includes('phê duyệt') ||
        statusNormalized.includes('hoàn thành') ||
        statusNormalized.includes('nghiệm thu') ||
        statusNormalized.includes('đạt')
      ) {
        status = 'approved';
      } else {
        status = 'pending';
      }

      const councilTypeName =
        assignment.LoaiHoiDong?.TenLoaiHoiDong ||
        assignment.HoiDong?.LoaiHoiDong?.TenLoaiHoiDong ||
        assignment.HoiDong?.TenHoiDong ||
        'Hội đồng chuyên môn';

      return {
        id: project.MaDT,
        topicName: project.TenDT,
        status,
        councilTypeName,
        submittedDate: (project.NgayTao || assignment.NgayPhanCong || new Date()).toISOString(),
        processedDate: project.NgayXetDuyet
          ? new Date(project.NgayXetDuyet).toISOString()
          : status !== 'pending' && project.NgayKetThuc
          ? new Date(project.NgayKetThuc).toISOString()
          : null,
      };
    });

    const overview = {
      totalTopics: topics.length,
      pending: topics.filter((t) => t.status === 'pending').length,
      approved: topics.filter((t) => t.status === 'approved').length,
    };

    return { overview, topics };
  }

  async exportCouncilTopicsReport(account: string, query: StatisticsExportQueryDto) {
    const data = await this.getCouncilTopicStatistics(account);
    if (query.format === 'excel') return this.exportCouncilExcel(data);
    if (query.format === 'pdf') return this.exportCouncilPdf(data);
    return this.exportCouncilDocx(data);
  }

  private async exportCouncilExcel(data: { overview: { totalTopics: number; pending: number; approved: number }; topics: any[] }) {
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet('Tổng quan');
    summary.addRow(['BÁO CÁO THỐNG KÊ ĐỀ TÀI HỘI ĐỒNG']);
    summary.mergeCells('A1:B1');
    summary.getCell('A1').font = { bold: true, size: 16 };
    summary.addRows([
      ['Tổng đề tài', data.overview.totalTopics],
      ['Chờ phê duyệt', data.overview.pending],
      ['Đã phê duyệt', data.overview.approved],
    ]);
    summary.columns = [{ width: 24 }, { width: 18 }];

    const list = workbook.addWorksheet('Danh sách đề tài');
    list.columns = [
      { header: 'Mã đề tài', key: 'id', width: 18 },
      { header: 'Tên đề tài', key: 'topicName', width: 45 },
      { header: 'Loại hội đồng', key: 'councilTypeName', width: 24 },
      { header: 'Trạng thái', key: 'status', width: 20 },
      { header: 'Ngày gửi', key: 'submittedDate', width: 16 },
      { header: 'Ngày xử lý', key: 'processedDate', width: 16 },
    ];
    list.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    list.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6E3C' } };

    const statusMap = { pending: 'Chờ phê duyệt', approved: 'Đã phê duyệt', rejected: 'Từ chối' };
    data.topics.forEach((t) => {
      list.addRow({
        id: t.id,
        topicName: t.topicName,
        councilTypeName: t.councilTypeName,
        status: statusMap[t.status as 'pending' | 'approved' | 'rejected'] || t.status,
        submittedDate: t.submittedDate ? new Date(t.submittedDate).toLocaleDateString('vi-VN') : '',
        processedDate: t.processedDate ? new Date(t.processedDate).toLocaleDateString('vi-VN') : '—',
      });
    });

    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: 'thong-ke-de-tai-hoi-dong.xlsx',
    };
  }

  private exportCouncilPdf(data: { overview: { totalTopics: number; pending: number; approved: number }; topics: any[] }) {
    return new Promise<{ buffer: Buffer; contentType: string; fileName: string }>((resolve) => {
      const document = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () =>
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: 'application/pdf',
          fileName: 'thong-ke-de-tai-hoi-dong.pdf',
        }),
      );
      const fontPath = process.env.PDF_FONT_PATH || (process.platform === 'win32' ? 'C:\\Windows\\Fonts\\arial.ttf' : '');
      if (fontPath && existsSync(fontPath)) document.font(fontPath);
      document.fontSize(18).text('BÁO CÁO THỐNG KÊ ĐỀ TÀI HỘI ĐỒNG', { align: 'center' }).moveDown();
      document.fontSize(11).text(
        `Tổng đề tài: ${data.overview.totalTopics} | Chờ phê duyệt: ${data.overview.pending} | Đã phê duyệt: ${data.overview.approved}`,
      ).moveDown();
      const statusMap = { pending: 'Chờ phê duyệt', approved: 'Đã phê duyệt', rejected: 'Từ chối' };
      data.topics.forEach((t) =>
        document.text(
          `${t.id} | ${t.topicName} | ${t.councilTypeName} | ${statusMap[t.status as 'pending' | 'approved' | 'rejected'] || t.status}`,
        ),
      );
      document.end();
    });
  }

  private async exportCouncilDocx(data: { overview: { totalTopics: number; pending: number; approved: number }; topics: any[] }) {
    const statusMap = { pending: 'Chờ phê duyệt', approved: 'Đã phê duyệt', rejected: 'Từ chối' };
    const header = ['Mã đề tài', 'Tên đề tài', 'Loại hội đồng', 'Trạng thái', 'Ngày gửi'];
    const table = new Table({
      rows: [
        new TableRow({
          children: header.map(
            (v) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, bold: true })] })] }),
          ),
        }),
        ...data.topics.map(
          (t) =>
            new TableRow({
              children: [
                t.id,
                t.topicName,
                t.councilTypeName,
                statusMap[t.status as 'pending' | 'approved' | 'rejected'] || t.status,
                t.submittedDate ? new Date(t.submittedDate).toLocaleDateString('vi-VN') : '',
              ].map((value) => new TableCell({ children: [new Paragraph(value)] })),
            }),
        ),
      ],
    });

    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: 'BÁO CÁO THỐNG KÊ ĐỀ TÀI HỘI ĐỒNG', heading: HeadingLevel.TITLE }),
            new Paragraph(
              `Tổng đề tài: ${data.overview.totalTopics} | Chờ phê duyệt: ${data.overview.pending} | Đã phê duyệt: ${data.overview.approved}`,
            ),
            table,
          ],
        },
      ],
    });

    return {
      buffer: Buffer.from(await Packer.toBuffer(document)),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'thong-ke-de-tai-hoi-dong.docx',
    };
  }
}
