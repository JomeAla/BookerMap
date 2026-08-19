import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type TrapType = 'TRAP_FIELD' | 'DECOY_ENDPOINT' | 'SUSPICIOUS_PATTERN';

export interface RecordHitInput {
  ip: string;
  trapType: TrapType;
  field?: string;
  path?: string;
  userAgent?: string;
  referer?: string;
  tenantSlug?: string;
  requestBody?: Record<string, unknown>;
}

export interface BlockDecision {
  blocked: boolean;
  reason: string | null;
  hitCount: number;
}

const HIT_THRESHOLD = 3;
const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class HoneypotService {
  private readonly logger = new Logger(HoneypotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordHit(input: RecordHitInput): Promise<BlockDecision> {
    const ip = input.ip;
    const now = new Date();

    await this.prisma.honeypotHit.create({
      data: {
        ipAddress: ip,
        trapType: input.trapType,
        field: input.field,
        path: input.path,
        userAgent: input.userAgent,
        referer: input.referer,
        tenantSlug: input.tenantSlug,
        requestBody: input.requestBody ? JSON.parse(JSON.stringify(input.requestBody)) : undefined,
      },
    });

    const reputation = await this.prisma.ipReputation.upsert({
      where: { ipAddress: ip },
      update: {
        hitCount: { increment: 1 },
        lastSeenAt: now,
        updatedAt: now,
      },
      create: {
        ipAddress: ip,
        hitCount: 1,
        blocked: false,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });

    if (reputation.blocked && reputation.blockExpiresAt && reputation.blockExpiresAt > now) {
      return { blocked: true, reason: reputation.blockedReason, hitCount: reputation.hitCount };
    }

    const recentHits = await this.prisma.honeypotHit.count({
      where: {
        ipAddress: ip,
        createdAt: { gte: new Date(now.getTime() - WINDOW_MS) },
      },
    });

    if (recentHits >= HIT_THRESHOLD) {
      const blockExpiresAt = new Date(now.getTime() + BLOCK_DURATION_MS);
      const reason = `Auto-blocked: ${recentHits} honeypot hits within 10 minutes`;
      await this.prisma.ipReputation.update({
        where: { ipAddress: ip },
        data: { blocked: true, blockedReason: reason, blockExpiresAt, updatedAt: new Date() },
      });
      this.logger.warn(`Auto-blocked ${ip}: ${reason}`);
      return { blocked: true, reason, hitCount: recentHits };
    }

    return { blocked: false, reason: null, hitCount: recentHits };
  }

  async isBlocked(ip: string): Promise<boolean> {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
      return false;
    }
    const reputation = await this.prisma.ipReputation.findUnique({ where: { ipAddress: ip } });
    if (!reputation || !reputation.blocked) {
      return false;
    }
    if (reputation.blockExpiresAt && reputation.blockExpiresAt <= new Date()) {
      await this.prisma.ipReputation.update({
        where: { ipAddress: ip },
        data: { blocked: false, blockedReason: null, blockExpiresAt: null, updatedAt: new Date() },
      });
      return false;
    }
    return true;
  }

  async listHits(params: { trapType?: string; ip?: string; limit?: number; offset?: number }) {
    const { trapType, ip, limit = 50, offset = 0 } = params;
    const where: Record<string, unknown> = {};
    if (trapType) where.trapType = trapType;
    if (ip) where.ipAddress = ip;

    const [items, total] = await Promise.all([
      this.prisma.honeypotHit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
      this.prisma.honeypotHit.count({ where }),
    ]);

    return { items, total };
  }

  async listBlocked() {
    return this.prisma.ipReputation.findMany({
      where: { blocked: true, blockExpiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async unblock(ip: string) {
    return this.prisma.ipReputation.upsert({
      where: { ipAddress: ip },
      update: {
        blocked: false,
        blockedReason: null,
        blockExpiresAt: null,
        hitCount: 0,
        updatedAt: new Date(),
      },
      create: {
        ipAddress: ip,
        hitCount: 0,
        blocked: false,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }
}