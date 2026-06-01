import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DomainResolverMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.headers['host']?.toLowerCase().trim();

    if (host) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { customDomain: host },
        select: { id: true, slug: true, domainVerified: true },
      });

      if (tenant && tenant.domainVerified) {
        (req as any).tenantFromDomain = {
          tenantId: tenant.id,
          slug: tenant.slug,
        };
      }
    }

    next();
  }
}
