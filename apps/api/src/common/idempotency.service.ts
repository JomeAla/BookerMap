import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private prisma: PrismaService) {}

  async getCached(key: string, requestHash?: string) {
    const record = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!record) return null;
    if (record.expiresAt < new Date()) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      return null;
    }
    if (requestHash && record.requestHash && record.requestHash !== requestHash) {
      return { conflict: true };
    }
    return { data: record.response, statusCode: record.statusCode };
  }

  async cache(key: string, response: any, statusCode = 200, ttlMinutes = 60, requestHash?: string) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      create: { key, response, statusCode, expiresAt, requestHash },
      update: { response, statusCode, expiresAt, requestHash },
    });
  }
}
