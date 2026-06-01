import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private prisma: PrismaService) {}

  async generateKey(tenantId: string, name: string, scopes: string[], rateLimit?: number, expiresAt?: string) {
    const rawKey = 'bmap_' + crypto.randomBytes(24).toString('hex');
    const hash = this.hashKey(rawKey);
    const prefix = rawKey.substring(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name,
        key: hash,
        keyPrefix: prefix,
        scopes,
        rateLimit: rateLimit ?? 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return { apiKey: { ...apiKey, key: undefined }, rawKey };
  }

  async validateKey(key: string) {
    const hash = this.hashKey(key);
    const apiKey = await this.prisma.apiKey.findUnique({ where: { key: hash } });
    if (!apiKey) throw new NotFoundException('Invalid API key');
    if (!apiKey.isActive) throw new BadRequestException('API key is deactivated');
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) throw new BadRequestException('API key has expired');

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  async revokeKey(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');

    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listKeys(tenantId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  async getKeyInfo(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!key) throw new NotFoundException('API key not found');
    return key;
  }

  async updateScopes(tenantId: string, id: string, scopes: string[]) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');

    return this.prisma.apiKey.update({
      where: { id },
      data: { scopes },
    });
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
