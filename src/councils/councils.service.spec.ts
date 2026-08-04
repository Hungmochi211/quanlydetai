import { BadRequestException } from '@nestjs/common';
import { CouncilsService } from './councils.service';

describe('CouncilsService', () => {
  let service: CouncilsService;
  let councils: any[];
  let members: any[];
  let assignments: any[];
  let councilTypes: any[];

  beforeEach(() => {
    councilTypes = [{ MaLoaiHoiDong: 1, TenLoaiHoiDong: 'Xét duyệt', NghiepVu: 'approval' }];
    councils = [{ MaHoiDong: 1, TenHoiDong: 'Hội đồng xét duyệt CNTT', MaLoaiHoiDong: 1 }];
    members = [];
    assignments = [];
    const users = [{ TaiKhoan: 'lecturer01', TenDayDu: 'Giảng viên A' }];

    const councilRepository = {
      findOne: jest.fn(async ({ where }: any) => {
        const council = councils.find((item) => item.MaHoiDong === where.MaHoiDong);
        if (!council) return null;
        return {
          ...council,
          LoaiHoiDong: councilTypes.find((type) => type.MaLoaiHoiDong === council.MaLoaiHoiDong),
          ThanhVienHoiDong: members
            .filter((member) => member.MaHoiDong === council.MaHoiDong)
            .map((member) => ({ ...member, NguoiDung: users.find((u) => u.TaiKhoan === member.TaiKhoan) })),
          HoiDongDeTai: assignments.filter((item) => item.MaHoiDong === council.MaHoiDong),
        };
      }),
      create: jest.fn((data) => data),
      save: jest.fn(async (council) => {
        const saved = { MaHoiDong: council.MaHoiDong ?? councils.length + 1, ...council };
        councils.push(saved);
        return saved;
      }),
      update: jest.fn(),
      delete: jest.fn(async ({ MaHoiDong }) => ({ affected: councils.some((c) => c.MaHoiDong === MaHoiDong) ? 1 : 0 })),
      find: jest.fn(),
    };
    const memberRepository = {
      findOne: jest.fn(async ({ where }: any) =>
        members.find((member) => member.MaHoiDong === where.MaHoiDong && member.TaiKhoan === where.TaiKhoan) ?? null,
      ),
      create: jest.fn((data) => data),
      save: jest.fn(async (member) => {
        members.push(member);
        return member;
      }),
      delete: jest.fn(async ({ MaHoiDong, TaiKhoan }) => {
        const index = members.findIndex((member) => member.MaHoiDong === MaHoiDong && member.TaiKhoan === TaiKhoan);
        if (index >= 0) members.splice(index, 1);
        return { affected: index >= 0 ? 1 : 0 };
      }),
    };
    const assignmentRepository = {
      count: jest.fn(async ({ where }: any) => assignments.filter((item) => item.MaHoiDong === where.MaHoiDong).length),
      findOne: jest.fn(async ({ where }: any) => assignments.find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      ) ?? null),
      create: jest.fn((data) => data),
      save: jest.fn(async (assignment) => {
        assignments.push(assignment);
        return assignment;
      }),
      delete: jest.fn(),
    };
    const councilTypeRepository = {
      find: jest.fn(async () => councilTypes),
      findOne: jest.fn(async ({ where }: any) =>
        councilTypes.find((type) => type.MaLoaiHoiDong === where.MaLoaiHoiDong || type.TenLoaiHoiDong === where.TenLoaiHoiDong) ?? null,
      ),
      create: jest.fn((data) => data),
      save: jest.fn(async (type) => {
        const saved = { MaLoaiHoiDong: type.MaLoaiHoiDong ?? councilTypes.length + 1, ...type };
        councilTypes.push(saved);
        return saved;
      }),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const userRepository = {
      findOne: jest.fn(async ({ where }: any) => users.find((user) => user.TaiKhoan === where.TaiKhoan) ?? null),
      find: jest.fn(async () => users),
    };
    const projectRepository = {
      findOne: jest.fn(async ({ where }: any) => where.MaDT === 'DT01' ? { MaDT: 'DT01' } : null),
    };
    const projectMemberRepository = { findOne: jest.fn() };
    const requestRepository = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    const notifications = { create: jest.fn() };

    service = new CouncilsService(
      councilRepository as any,
      memberRepository as any,
      assignmentRepository as any,
      councilTypeRepository as any,
      userRepository as any,
      projectRepository as any,
      projectMemberRepository as any,
      requestRepository as any,
      notifications as any,
    );
  });

  it('tạo hội đồng và chuẩn hóa tên', async () => {
    const result = await service.create({
      TenHoiDong: '  Hội đồng nghiệm thu CNTT  ',
      MaLoaiHoiDong: 1,
    });
    expect(result).toMatchObject({ TenHoiDong: 'Hội đồng nghiệm thu CNTT', MaLoaiHoiDong: 1 });
  });

  it('không cho thêm trùng một người vào cùng hội đồng', async () => {
    await service.addMember(1, { TaiKhoan: 'lecturer01', ChucDanh: 'Chủ tịch' });
    await expect(service.addMember(1, { TaiKhoan: 'lecturer01' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('không gán hội đồng rỗng cho đề tài', async () => {
    await expect(service.assignToProject('DT01', { MaHoiDong: 1 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('gán hội đồng đã có thành viên cho đề tài và chặn trùng loại', async () => {
    await service.addMember(1, { TaiKhoan: 'lecturer01' });
    await expect(service.assignToProject('DT01', { MaHoiDong: 1 }))
      .resolves.toMatchObject({ MaDT: 'DT01', MaHoiDong: 1, MaLoaiHoiDong: 1 });

    await expect(service.assignToProject('DT01', { MaHoiDong: 1 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('không xóa hội đồng đã được phân công cho đề tài', async () => {
    assignments.push({ MaHoiDong: 1, MaDT: 'DT01', MaLoaiHoiDong: 1 });
    await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Admin có thể thêm loại hội đồng mới mà không sửa code', async () => {
    await expect(service.createType({
      TenLoaiHoiDong: '  Tuyển chọn cấp khoa  ',
      NghiepVu: 'other',
    })).resolves.toMatchObject({ TenLoaiHoiDong: 'Tuyển chọn cấp khoa', NghiepVu: 'other' });
  });
});
