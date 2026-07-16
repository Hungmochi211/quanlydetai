import { ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';

describe('ProjectService - xét duyệt nhiều hội đồng', () => {
  let service: ProjectService;
  let project: any;
  let approvals: any[];

  beforeEach(() => {
    project = { MaDT: 'DT01', TrangThai: 'Chờ phê duyệt', NgayXetDuyet: null };
    approvals = [];
    let nextApprovalId = 1;

    const projectRepository = {
      findOne: jest.fn(async ({ where }) => (where.MaDT === project.MaDT ? project : null)),
      save: jest.fn(async (entity) => entity),
    };

    const memberRepository = {
      findOne: jest.fn(async ({ where }) =>
        where.TaiKhoan === 'leader'
          ? { MaDT: 'DT01', TaiKhoan: 'leader', VaiTroDT: 'Nhóm trưởng' }
          : null,
      ),
    };

    const approvalRepository = {
      create: jest.fn((data) => data),
      delete: jest.fn(async ({ MaDT }) => {
        approvals = approvals.filter((approval) => approval.MaDT !== MaDT);
      }),
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
        { TaiKhoan: 'committee-1', VaiTro: 'Hội đồng' },
        { TaiKhoan: 'committee-2', VaiTro: 'Hội đồng' },
      ]),
    };

    service = new ProjectService(
      projectRepository as any,
      memberRepository as any,
      approvalRepository as any,
      userRepository as any,
    );
  });

  it('không cho thành viên thường thao tác của nhóm trưởng', async () => {
    await expect(service.ensureProjectLeader('DT01', 'member')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('chỉ bắt đầu đề tài sau khi toàn bộ hội đồng đã phê duyệt', async () => {
    await service.submitForApproval('DT01', 'leader', {
      reviewerIds: ['committee-1', 'committee-2'],
    });

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
    await service.submitForApproval('DT01', 'leader', {
      reviewerIds: ['committee-1', 'committee-2'],
    });

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
});
