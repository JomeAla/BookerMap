import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // A PLATFORM_ADMIN may target another tenant via the x-tenant-id header
    if (user?.role === UserRole.PLATFORM_ADMIN && request.headers?.['x-tenant-id']) {
      return request.headers['x-tenant-id'];
    }
    return user?.tenantId;
  },
);
