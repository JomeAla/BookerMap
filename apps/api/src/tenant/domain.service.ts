import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DomainService {
  constructor(private prisma: PrismaService) {}

  async addDomain(tenantId: string, domain: string) {
    const normalized = domain.toLowerCase().trim();

    const existing = await this.prisma.tenant.findUnique({
      where: { customDomain: normalized },
    });
    if (existing && existing.id !== tenantId) {
      throw new ConflictException('This domain is already in use by another tenant');
    }

    const token = `bookermap-verify=${tenantId}-${crypto.randomBytes(16).toString('hex')}`;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: normalized,
        domainVerified: false,
        domainVerifiedAt: null,
        domainVerificationToken: token,
      },
      select: {
        id: true,
        customDomain: true,
        domainVerified: true,
        domainVerificationToken: true,
      },
    });
  }

  async verifyDomain(tenantId: string, force = false) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.customDomain) throw new BadRequestException('No custom domain configured');
    if (!tenant.domainVerificationToken) throw new BadRequestException('No verification token found. Please add the domain first.');

    if (force) {
      return this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          domainVerified: true,
          domainVerifiedAt: new Date(),
        },
        select: {
          id: true,
          customDomain: true,
          domainVerified: true,
          domainVerifiedAt: true,
        },
      });
    }

    const verified = await this.simulateDnsCheck(tenant.customDomain, tenant.domainVerificationToken);

    if (!verified) {
      throw new BadRequestException(
        'DNS verification failed. Ensure you have added the TXT record to your DNS configuration and it has propagated.',
      );
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        domainVerified: true,
        domainVerifiedAt: new Date(),
        domainVerificationToken: null,
      },
      select: {
        id: true,
        customDomain: true,
        domainVerified: true,
        domainVerifiedAt: true,
      },
    });
  }

  async removeDomain(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.customDomain) throw new BadRequestException('No custom domain configured');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        domainVerified: false,
        domainVerifiedAt: null,
        domainVerificationToken: null,
      },
      select: {
        id: true,
        customDomain: true,
        domainVerified: true,
      },
    });
  }

  getDomainConfig(tenant: { id: string; customDomain?: string | null; domainVerificationToken?: string | null }) {
    const cnameTarget = 'bookermap.app';
    const txtValue = tenant.domainVerificationToken || `bookermap-verify=${tenant.id}-{random}`;

    return {
      domain: tenant.customDomain || null,
      cnameRecord: {
        name: tenant.customDomain || '<your-domain>',
        type: 'CNAME',
        value: cnameTarget,
        ttl: '3600',
        description: 'Point your domain to BookerMap',
      },
      txtRecord: {
        name: tenant.customDomain || '<your-domain>',
        type: 'TXT',
        value: txtValue,
        ttl: '3600',
        description: 'Verification TXT record to prove domain ownership',
      },
      verificationStatus: tenant.customDomain ? 'pending' : 'not_configured',
      instructions: [
        '1. Go to your domain provider\'s DNS settings (e.g., Cloudflare, Namecheap, GoDaddy)',
        `2. Create a CNAME record pointing ${tenant.customDomain || '<your-domain>'} to ${cnameTarget}`,
        `3. Create a TXT record with the value: ${txtValue}`,
        '4. Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)',
        '5. Click "Verify Domain" to confirm ownership',
        '6. Once verified, your booking portal will be available at your custom domain',
      ],
    };
  }

  async resolveTenantFromDomain(host: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { customDomain: host },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        timezone: true,
        currency: true,
        customDomain: true,
        domainVerified: true,
      },
    });
    return tenant;
  }

  private async simulateDnsCheck(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const dns = require('dns');
      const records = await new Promise<string[]>((resolve, reject) => {
        dns.resolveTxt(domain, (err: Error | null, addresses: string[][]) => {
          if (err) {
            resolve([]);
            return;
          }
          resolve(addresses.map((a) => a.join('')));
        });
      });

      return records.some((record) => record.includes(expectedToken));
    } catch {
      return false;
    }
  }
}
