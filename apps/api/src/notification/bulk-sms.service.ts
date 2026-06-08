import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { SmsCreditService } from './sms-credit.service';

interface CreateCampaignDto {
  name: string;
  message: string;
  segment?: any;
  scheduledAt?: string;
}

@Injectable()
export class BulkSmsService {
  private readonly logger = new Logger(BulkSmsService.name);
  private readonly BATCH_SIZE = 50;

  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
    private smsCreditService: SmsCreditService,
  ) {}

  async createCampaign(tenantId: string, createdById: string, dto: CreateCampaignDto) {
    const customers = await this.getSegmentCustomers(tenantId, dto.segment);

    const campaign = await this.prisma.bulkSmsCampaign.create({
      data: {
        tenantId,
        name: dto.name,
        message: dto.message,
        segment: dto.segment ?? null,
        recipientCount: customers.length,
        status: 'DRAFT',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById,
        recipients: {
          create: customers.map((c) => ({
            customerId: c.id,
            phone: c.phone,
            status: 'PENDING',
          })),
        },
      },
      include: { recipients: true },
    });

    return campaign;
  }

  async sendCampaign(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.bulkSmsCampaign.findUnique({
      where: { id: campaignId },
      include: { recipients: { where: { status: 'PENDING' } } },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.tenantId !== tenantId) {
      throw new BadRequestException('Campaign does not belong to your tenant');
    }
    if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
      throw new BadRequestException('Campaign already sent or in progress');
    }
    if (campaign.recipients.length === 0) {
      throw new BadRequestException('No pending recipients');
    }

    const canDeduct = await this.smsCreditService.deductCredits(
      tenantId,
      campaign.recipients.length,
      'SMS',
      `Bulk SMS campaign: ${campaign.name}`,
    );
    if (!canDeduct) {
      throw new BadRequestException('Insufficient SMS credits');
    }

    await this.prisma.bulkSmsCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    let sentCount = 0;
    let failedCount = 0;
    let totalCost = 0;

    const batches: typeof campaign.recipients[] = [];
    for (let i = 0; i < campaign.recipients.length; i += this.BATCH_SIZE) {
      batches.push(campaign.recipients.slice(i, i + this.BATCH_SIZE));
    }

    for (const batch of batches) {
      const phones = batch.map((r) => r.phone);
      const result = await this.smsService.sendBulkSms(phones, campaign.message);

      for (const recipient of batch) {
        if (result.success) {
          sentCount++;
          totalCost += result.price ? result.price / batch.length : 0;
          await this.prisma.bulkSmsRecipient.update({
            where: { id: recipient.id },
            data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.messageId },
          });
        } else {
          failedCount++;
          await this.prisma.bulkSmsRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', errorMessage: result.error || 'Unknown error' },
          });
        }
      }
    }

    await this.prisma.bulkSmsCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentCount,
        failedCount,
        totalCost,
        completedAt: new Date(),
      },
    });

    return { sentCount, failedCount, totalCost };
  }

  async getCampaigns(tenantId: string) {
    return this.prisma.bulkSmsCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { recipients: true } },
      },
    });
  }

  async getCampaignDetail(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.bulkSmsCampaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        recipients: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.tenantId !== tenantId) {
      throw new BadRequestException('Campaign does not belong to your tenant');
    }

    return campaign;
  }

  async deleteCampaign(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.bulkSmsCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.tenantId !== tenantId) {
      throw new BadRequestException('Campaign does not belong to your tenant');
    }
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    await this.prisma.bulkSmsCampaign.delete({ where: { id: campaignId } });
    return { success: true };
  }

  private async getSegmentCustomers(tenantId: string, segment?: any) {
    const where: any = { tenantId };

    if (segment && segment.type === 'TAG' && segment.tag) {
      where.tags = { contains: segment.tag };
    } else if (segment && segment.type === 'RECENT' && segment.days) {
      const since = new Date();
      since.setDate(since.getDate() - segment.days);
      where.bookings = { some: { createdAt: { gte: since } } };
    }

    return this.prisma.customer.findMany({
      where,
      select: { id: true, phone: true },
    });
  }
}
