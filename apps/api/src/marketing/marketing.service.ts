import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createCampaign(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: { ...dto, tenantId },
    });
  }

  async updateCampaign(tenantId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async deleteCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  async getCampaigns(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignLogs(campaignId: string) {
    return this.prisma.campaignLog.findMany({
      where: { campaignId },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  async findLapsedCustomers(tenantId: string, daysSinceLastBooking: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastBooking);

    return this.prisma.customer.findMany({
      where: {
        tenantId,
        email: { not: null },
        bookings: {
          none: { startTime: { gte: cutoffDate }, status: { not: 'CANCELLED' } },
        },
      },
      include: {
        bookings: { orderBy: { startTime: 'desc' }, take: 1 },
      },
    });
  }

  async processCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || !campaign.isActive) return { sent: 0, total: 0 };

    const customers = await this.findLapsedCustomers(campaign.tenantId, campaign.triggerDays);
    let sentCount = 0;

    for (const customer of customers) {
      if (!customer.email) continue;
      try {
        let body = campaign.body;
        if (campaign.discountPercent) {
          body = body.replace('{{discount}}', `${campaign.discountPercent}%`);
          body = body.replace('{{discountCode}}', `LAPSED${campaign.discountPercent}`);
        }
        body = body.replace('{{firstName}}', customer.firstName || 'there');
        body = body.replace('{{lastBookingDate}}', customer.bookings[0]?.startTime?.toLocaleDateString() || 'N/A');

        const textBody = body.replace(/<[^>]+>/g, '');

        await this.emailService.sendMail({
          to: customer.email,
          subject: campaign.subject,
          text: textBody,
          html: body,
        });

        await this.prisma.campaignLog.create({
          data: {
            campaignId,
            tenantId: campaign.tenantId,
            customerId: customer.id,
            email: customer.email,
          },
        });
        sentCount++;
      } catch (e) {
        this.logger.error(`Failed to send campaign email to ${customer.email}: ${e instanceof Error ? e.message : e}`);
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { lastSentAt: new Date(), sentCount: { increment: sentCount } },
    });

    return { sent: sentCount, total: customers.length };
  }

  async processAllActiveCampaigns() {
    const campaigns = await this.prisma.campaign.findMany({ where: { isActive: true } });
    const results = [];
    for (const c of campaigns) {
      const result = await this.processCampaign(c.id);
      results.push({ campaignId: c.id, name: c.name, ...result });
    }
    return results;
  }
}
