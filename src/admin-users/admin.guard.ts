import { CanActivate, ExecutionContext, ForbiddenException, Injectable, } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const role = this.normalizeRole(request.user?.VaiTro);

    if (role !== 'admin' && role !== 'quan tri') {
      throw new ForbiddenException('Chỉ quản trị viên được phép thực hiện thao tác này');
    }
    return true;
  }

  private normalizeRole(role?: string) {
    return (role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .trim();
  }
}
