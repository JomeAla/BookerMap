import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsCreditService {
  private readonly logger = new Logger(SmsCreditService.name);
  private readonly COST_PER_SMS = 1;
  private readonly COST_PER_WHATSAPP = 1;

  constructor(private prisma: PrismaService) {}

  async getBalance(tenantId: string): Promise<{ balance: number; totalPurchased: number; totalUsed: number }> {
    let credit = await this.prisma.smsCredit.findUnique({ where: { tenantId } });
    if (!credit) {
      credit = await this.prisma.smsCredit.create({
        data: { tenantId, balance: 0, totalPurchased: 0, totalUsed: 0 },
      });
    }
    return { balance: credit.balance, totalPurchased: credit.totalPurchased, totalUsed: credit.totalUsed };
  }

  async grantCredits(tenantId: string, amount: number, grantedById: string, description?: string): Promise<{ balance: number }> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const credit = await this.prisma.smsCredit.upsert({
      where: { tenantId },
      create: { tenantId, balance: amount, totalPurchased: amount, totalUsed: 0 },
      update: { balance: { increment: amount }, totalPurchased: { increment: amount } },
    });

    await this.prisma.smsCreditTransaction.create({
      data: {
        tenantId,
        amount,
        balanceAfter: credit.balance,
        type: 'GRANT',
        description: description || 'Credits granted by admin',
        grantedById,
      },
    });

    this.logger.log(`Granted ${amount} credits to tenant ${tenantId}. New balance: ${credit.balance}`);
    return { balance: credit.balance };
  }

  async deductCredits(tenantId: string, amount: number, channel: 'SMS' | 'WHATSAPP', description?: string): Promise<boolean> {
    if (amount <= 0) return true;

    const settings = await this.prisma.platformSmsSettings.findFirst();
    const smsPrice = settings?.smsPricePerUnit ?? this.COST_PER_SMS;
    const whatsappPrice = settings?.whatsappPricePerUnit ?? this.COST_PER_WHATSAPP;
    const cost = channel === 'SMS' ? Math.ceil(amount * smsPrice) : Math.ceil(amount * whatsappPrice);

    const credit = await this.prisma.smsCredit.findUnique({ where: { tenantId } });
    if (!credit || credit.balance < cost) {
      this.logger.warn(`Insufficient credits for tenant ${tenantId}: balance=${credit?.balance || 0}, needed=${cost}`);
      return false;
    }

    const updated = await this.prisma.smsCredit.update({
      where: { tenantId },
      data: { balance: { decrement: cost }, totalUsed: { increment: cost } },
    });

    await this.prisma.smsCreditTransaction.create({
      data: {
        tenantId,
        amount: cost,
        balanceAfter: updated.balance,
        type: channel === 'SMS' ? 'SMS_DEDUCT' : 'WHATSAPP_DEDUCT',
        description: description || `${channel} message sent`,
      },
    });

    return true;
  }

  async getTransactions(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.smsCreditTransaction.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.smsCreditTransaction.count({ where: { tenantId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}