import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSmsTemplateDto, UpdateSmsTemplateDto } from './dto/sms-template.dto';

export type SmsTemplateType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_REMINDER'
  | 'EN_ROUTE'
  | 'CUSTOM';

const DEFAULT_TEMPLATES: Record<string, string> = {
  BOOKING_CONFIRMATION:
    'Booking Confirmed! {{serviceName}} on {{startTime}}. Ref: {{bookingId}}',
  BOOKING_REMINDER:
    'Reminder: {{serviceName}} is in 24 hours on {{startTime}}.{{address ? " Location: " + address : ""}}',
  EN_ROUTE:
    'Your technician {{technicianName}} is en route! Estimated arrival: {{eta}}.',
};

@Injectable()
export class SmsTemplateService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSmsTemplateDto) {
    const existing = await this.prisma.smsTemplate.findUnique({
      where: { tenantId_type: { tenantId, type: dto.type } },
    });
    if (existing) {
      throw new BadRequestException(
        `A template with type "${dto.type}" already exists for this tenant`,
      );
    }
    return this.prisma.smsTemplate.create({
      data: { ...dto, tenantId },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.smsTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const tpl = await this.prisma.smsTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!tpl) throw new NotFoundException('SMS template not found');
    return tpl;
  }

  async findByType(tenantId: string, type: string) {
    return this.prisma.smsTemplate.findFirst({
      where: { tenantId, type, isActive: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSmsTemplateDto) {
    await this.findById(tenantId, id);
    return this.prisma.smsTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.smsTemplate.delete({ where: { id } });
    return { success: true };
  }

  async seedDefaults(tenantId: string) {
    let created = 0;
    for (const [type, body] of Object.entries(DEFAULT_TEMPLATES)) {
      const existing = await this.prisma.smsTemplate.findUnique({
        where: { tenantId_type: { tenantId, type } },
      });
      if (!existing) {
        await this.prisma.smsTemplate.create({
          data: {
            tenantId,
            type,
            name: type
              .toLowerCase()
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            body,
            isActive: true,
          },
        });
        created += 1;
      }
    }
    return { success: true, created };
  }

  render(body: string, variables: Record<string, string>): string {
    let result = body;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value || '',
      );
    }
    return result;
  }

  async renderTemplate(
    tenantId: string,
    type: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const tpl = await this.findByType(tenantId, type);
    const body = tpl?.body || DEFAULT_TEMPLATES[type] || '';
    return this.render(body, variables);
  }
}
