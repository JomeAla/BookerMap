import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../notification/sms.service';
import { EmailService } from '../notification/email.service';
import { RequestOtpDto, OtpChannel } from './dto/request-otp.dto';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class CustomerOtpService {
  private readonly logger = new Logger(CustomerOtpService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  async requestOtp(tenantSlug: string, dto: RequestOtpDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const customer = await this.getOrCreateCustomer(tenant.id, dto);

    await this.prisma.customerOtp.deleteMany({
      where: { customerId: customer.id, usedAt: null },
    });

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashCode(code);
    const channel = dto.channel || OtpChannel.SMS;

    await this.prisma.customerOtp.create({
      data: {
        customerId: customer.id,
        codeHash,
        channel,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.deliverOtp(customer, code, channel);

    const devCode = process.env.NODE_ENV !== 'production' ? code : undefined;
    return { success: true, message: 'OTP sent', expiresIn: 600, devCode };
  }

  async verifyOtp(tenantSlug: string, phone: string, code: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new BadRequestException('Tenant not found');

    const customer = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone } },
    });
    if (!customer) throw new BadRequestException('No OTP has been requested for this phone number');

    const otp = await this.prisma.customerOtp.findFirst({
      where: { customerId: customer.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('No active OTP found. Please request a new code');

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('This OTP has expired. Please request a new code');
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many failed attempts. Please request a new code');
    }

    if (!this.matchesCode(otp.codeHash, code)) {
      await this.prisma.customerOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP code');
    }

    await this.prisma.customerOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const accessToken = this.jwtService.sign({
      sub: customer.id,
      tenantId: customer.tenantId,
      role: 'CUSTOMER',
      type: 'customer',
    }, { expiresIn: '30d' });

    return { accessToken, customer };
  }

  private async getOrCreateCustomer(tenantId: string, dto: RequestOtpDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: dto.phone } },
    });

    if (existing) {
      if (dto.email && dto.email !== existing.email) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: { email: dto.email },
        });
      }
      return existing;
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        phone: dto.phone,
        email: dto.email || null,
        firstName: dto.firstName || 'Guest',
        lastName: dto.lastName || 'Customer',
      },
    });
  }

  private async deliverOtp(customer: any, code: string, channel: OtpChannel) {
    const message = `Your BookerMap verification code is ${code}. It expires in 10 minutes. Do not share it with anyone.`;

    if (channel === OtpChannel.EMAIL) {
      if (!customer.email) throw new BadRequestException('An email address is required for email OTP delivery');
      await this.emailService.sendMail({ to: customer.email, subject: 'Your verification code', text: message });
      return;
    }

    if (channel === OtpChannel.BOTH) {
      await this.smsService.sendSms(customer.phone, message);
      if (customer.email) {
        await this.emailService.sendMail({ to: customer.email, subject: 'Your verification code', text: message });
      }
      return;
    }

    await this.smsService.sendSms(customer.phone, message);
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(`bookermap-otp:${code}`).digest('hex');
  }

  private matchesCode(codeHash: string, code: string): boolean {
    return this.hashCode(code) === codeHash;
  }
}