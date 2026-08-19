import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PlatformAdminBootstrap implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminBootstrap.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensurePlatformAdmin();
    } catch (e: any) {
      this.logger.error(`Failed to bootstrap platform admin: ${e.message}`);
    }
  }

  async ensurePlatformAdmin() {
    const email = (
      this.configService.get<string>('PLATFORM_ADMIN_EMAIL') || 'platform@bookermap.com'
    ).toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role !== UserRole.PLATFORM_ADMIN) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: UserRole.PLATFORM_ADMIN },
        });
        this.logger.log(`Promoted ${email} to PLATFORM_ADMIN`);
      }
      return;
    }

    let platformTenant = await this.prisma.tenant.findUnique({
      where: { slug: 'bookermap-platform' },
    });

    if (!platformTenant) {
      platformTenant = await this.prisma.tenant.create({
        data: {
          name: 'BookerMap Platform',
          slug: 'bookermap-platform',
          domain: 'platform.bookermap.com',
        },
      });
      this.logger.log('Created platform tenant: bookermap-platform');
    }

    const defaultPassword = this.configService.get<string>('PLATFORM_ADMIN_PASSWORD');
    const passwordHash = await bcrypt.hash(defaultPassword || 'PlatformAdmin2026!', 12);

    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'BookerMap',
        lastName: 'Platform Admin',
        role: UserRole.PLATFORM_ADMIN,
        tenantId: platformTenant.id,
        emailVerified: true,
      },
    });

    this.logger.log(
      `Created PLATFORM_ADMIN ${email} (default password set; change after first login)`,
    );
  }
}