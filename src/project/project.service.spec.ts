import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';

describe('ProjectService - xét duyệt nhiều hội đồng', () => {
  let service: ProjectService;
  let project: any;
  let approvals: any[];
  let approvalHistory: any[];

  beforeEach(() => {
    project = { MaDT: 'DT01', TrangThai: 'Chờ phê duyệt', NgayXetDuyet: null };
    approvals = [];
    approvalHistory = [];
    let nextApprovalId = 1;

    const projectRepository = {
      findOne: jest.fn(async ({ where }) => (where.MaDT === project.MaDT ? project : null)),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn(async () => ({ affected: 1 })),
    };

    const memberRepository = {
      findOne: jest.fn(async ({ where }) =>
        (where.TaiKhoan === 'leader' || where.VaiTroDT === 'Nhóm trưởng')
          ? { MaDT: 'DT01', TaiKhoan: 'leader', VaiTroDT: 'Nhóm trưởng' }
          : null,
      ),
      delete: jest.fn(async () => ({ affected: 1 })),
    };

    const approvalRepository = {
      create: jest.fn((data) => data),
      delete: jest.fn(async (where) => {
        approvals = approvals.filter(
          (approval) => !Object.entries(where).every(([key, value]) => approval[key] === value),
        );
      }),
      count: jest.fn(async ({ where }) => approvals.filter((approval) => approval.MaDT === where.MaDT).length),
      save: jest.fn(async (entityOrEntities) => {
        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        for (const entity of entities) {
          if (!entity.Id) entity.Id = nextApprovalId++;
          const index = approvals.findIndex((approval) => approval.Id === entity.Id);
          if (index >= 0) approvals[index] = entity;
          else approvals.push(entity);
        }
        return Array.isArray(entityOrEntities) ? entities : entities[0];
      }),
      findOne: jest.fn(async ({ where }) =>
        approvals.find((approval) =>
          Object.entries(where).every(([key, value]) => approval[key] === value),
        ) ?? null,
      ),
      find: jest.fn(async ({ where }) => approvals.filter((approval) => approval.MaDT === where.MaDT)),
    };

    const userRepository = {
      find: jest.fn(async () => [
        { TaiKhoan: 'committee-1', VaiTro: 'Hội đồng xét duyệt' },
        { TaiKhoan: 'committee-2', VaiTro: 'Hội đồng xét duyệt' },
        { TaiKhoan: 'scorer-1', VaiTro: 'Hội đồng chấm điểm' },
      ]),
    };

    const approvalHistoryRepository = {
      create: jest.fn((data) => data),
      find: jest.fn(async () => approvalHistory),
      save: jest.fn(async (entities) => {
        approvalHistory.push(...(Array.isArray(entities) ? entities : [entities]));
        return entities;
      }),
    };

    const councilAssignments = [
      {
        MaDT: 'DT01',
        MaHoiDong: 8,
        MaLoaiHoiDong: 2,
        LoaiHoiDong: { NghiepVu: 'approval' },
      },
      {
        MaDT: 'DT01',
        MaHoiDong: 10,
        MaLoaiHoiDong: 4,
        LoaiHoiDong: { NghiepVu: 'scoring' },
      },
    ];

    service = new ProjectService(
      projectRepository as any,
      memberRepository as any,
      approvalRepository as any,
      approvalHistoryRepository as any,
      userRepository as any,
      { delete: jest.fn(async () => ({ affected: 0 })) } as any,
      {
        findOne: jest.fn(async ({ where }) => councilAssignments.find((item) =>
          item.MaDT === where.MaDT && item.MaHoiDong === where.MaHoiDong,
        ) ?? null),
        find: jest.fn(async ({ where }) => councilAssignments.filter((item) => item.MaDT === where.MaDT)),
        create: jest.fn((data) => data),
        save: jest.fn(async (data) => data),
      } as any,
      { find: jest.fn(async ({ where }) => where.MaHoiDong === 10
        ? [{ NguoiDung: { TaiKhoan: 'scorer-1' } }]
        : [{ NguoiDung: { TaiKhoan: 'committee-1' } }, { NguoiDung: { TaiKhoan: 'committee-2' } }]) } as any,
      { create: jest.fn() } as any,
    );
  });

  it('không cho thành viên thường thao tác của nhóm trưởng', async () => {
    await expect(service.ensureProjectLeader('DT01', 'member')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('chỉ bắt đầu đề tài sau khi toàn bộ hội đồng đã phê duyệt', async () => {
    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });

    const firstReview = await service.reviewProject('DT01', 'committee-1', {
      decision: 'approved',
    });
    expect(firstReview).toMatchObject({
      projectStatus: 'Chờ phê duyệt',
      totalReviewers: 2,
      approvedReviewers: 1,
      allApproved: false,
    });

    const finalReview = await service.reviewProject('DT01', 'committee-2', {
      decision: 'approved',
    });
    expect(finalReview).toMatchObject({
      projectStatus: 'Đã phê duyệt',
      totalReviewers: 2,
      approvedReviewers: 2,
      allApproved: true,
    });
  });

  it('chuyển đề tài sang từ chối nếu một hội đồng từ chối', async () => {
    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });

    const result = await service.reviewProject('DT01', 'committee-1', {
      decision: 'rejected',
      note: 'Cần bổ sung hồ sơ',
    });

    expect(result).toMatchObject({
      projectStatus: 'Từ chối',
      approvedReviewers: 0,
      allApproved: false,
    });
  });

  it('không cho phép nhóm trưởng gửi lại cùng một đề tài', async () => {
    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });

    await expect(service.submitForApproval('DT01', 'leader', { councilType: 'approval' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('chỉ tạo lại phiếu của thành viên từ chối khi nhóm trưởng gửi lại', async () => {
    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });
    await service.reviewProject('DT01', 'committee-2', { decision: 'approved' });
    await service.reviewProject('DT01', 'committee-1', {
      decision: 'rejected',
      note: 'Bổ sung thuyết minh',
    });

    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });

    expect(project.TrangThai).toBe('Chờ phê duyệt');
    expect(approvalHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        MaDT: 'DT01',
        LanXetDuyet: 1,
        TaiKhoanHoiDong: 'committee-1',
        TrangThai: 'Từ chối',
        GhiChu: 'Bổ sung thuyết minh',
      }),
    ]));
    expect(approvalHistory).toHaveLength(1);
    expect(approvals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        TaiKhoanHoiDong: 'committee-1',
        TrangThai: 'Chờ phê duyệt',
      }),
      expect.objectContaining({
        TaiKhoanHoiDong: 'committee-2',
        TrangThai: 'Đã phê duyệt',
      }),
    ]));
  });

  it('gửi lại đúng một phiếu cho thành viên hội đồng đã từ chối', async () => {
    await service.submitForApproval('DT01', 'leader', { councilType: 'approval' });
    await service.reviewProject('DT01', 'committee-1', {
      decision: 'rejected',
      note: 'Bổ sung mục tiêu',
    });

    await service.resendApprovalToReviewer(
      'DT01',
      'committee-1',
      'leader',
      'Đã cập nhật mục tiêu',
    );

    expect(approvalHistory).toHaveLength(1);
    expect(approvals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        TaiKhoanHoiDong: 'committee-1',
        TrangThai: 'Chờ phê duyệt',
        GhiChu: 'Đã cập nhật mục tiêu',
      }),
      expect.objectContaining({
        TaiKhoanHoiDong: 'committee-2',
        TrangThai: 'Chờ phê duyệt',
      }),
    ]));
  });

  it('xóa được đề tài Nháp sau khi xóa các thành viên và tài liệu liên quan', async () => {
    project.TrangThai = 'Nháp';

    await expect(service.deleteProject('DT01', 'leader')).resolves.toMatchObject({ affected: 1 });
  });

  it('chuyển đề tài sang Chờ nghiệm thu khi tiến độ đạt 100%', async () => {
    const result = await service.updateTienDoProject('DT01', 100);

    expect(result).toMatchObject({ TienDo: 100, TrangThai: 'Chờ nghiệm thu' });
  });

  it('không cho gửi Hội đồng chấm điểm khi đề tài chưa được phê duyệt', async () => {
    await expect(service.submitForApproval('DT01', 'leader', { councilType: 'scoring' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('cho gửi Hội đồng chấm điểm một lần sau khi đề tài đã được phê duyệt', async () => {
    project.TrangThai = 'Đã phê duyệt';

    const result = await service.submitForApproval('DT01', 'leader', { councilType: 'scoring' });
    expect(result.reviewers).toEqual(expect.arrayContaining([
      expect.objectContaining({ account: 'scorer-1', LoaiHoiDong: 'Chấm điểm' }),
    ]));

    await expect(service.submitForApproval('DT01', 'leader', { councilType: 'scoring' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
