import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class SmsCreditService {
  private readonly logger = new Logger(SmsCreditService.name);
  private readonly COST_PER_SMS = 1;
  private readonly COST_PER_WHATSAPP = 1;

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

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
        status: 'COMPLETED',
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
        status: 'COMPLETED',
        description: description || `${channel} message sent`,
      },
    });

    return true;
  }

  // Purchase flow: tenant buys credits, paid to the platform's account
  async checkout(tenantId: string, creditAmount: number, provider?: 'PAYSTACK' | 'FLUTTERWAVE') {
    if (creditAmount <= 0) throw new BadRequestException('Credit amount must be positive');

    const settings = await this.prisma.platformSmsSettings.findFirst();
    const smsPrice = settings?.smsPricePerUnit ?? this.COST_PER_SMS;
    const amount = Math.round(creditAmount * smsPrice);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, role: { in: ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });
    const email = adminUser?.email || tenant?.slug + '@bookermap.local';

    // Create a PENDING purchase transaction so it can be reconciled
    const transaction = await this.prisma.smsCreditTransaction.create({
      data: {
        tenantId,
        amount: creditAmount,
        balanceAfter: 0,
        type: 'PURCHASE',
        status: 'PENDING',
        provider: provider || 'PAYSTACK',
        description: `Purchase of ${creditAmount} SMS credits (${amount} ${tenant?.currency || 'NGN'})`,
      },
    });

    const result = await this.paymentService.initializePlatformPayment(
      email,
      amount,
      {
        smsCreditTransactionId: transaction.id,
        tenantId,
        title: 'BookerMap SMS Credits',
        description: `${creditAmount} SMS credits`,
      },
      provider,
      tenant?.currency || 'NGN',
    );

    await this.prisma.$transaction([
      this.prisma.smsCreditTransaction.update({
        where: { id: transaction.id },
        data: { providerRef: result.reference },
      }),
      this.prisma.payment.create({
        data: {
          amount,
          currency: tenant?.currency || 'NGN',
          status: 'PENDING',
          provider: (provider || 'PAYSTACK') as any,
          providerRef: result.reference,
          providerData: { smsCreditTransactionId: transaction.id, tenantId },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        accessCode: result.accessCode,
        amount,
        creditAmount,
        currency: tenant?.currency || 'NGN',
        email,
      },
    };
  }

  async verifyPurchase(tenantId: string, reference: string, provider?: 'PAYSTACK' | 'FLUTTERWAVE') {
    const transaction = await this.prisma.smsCreditTransaction.findFirst({
      where: { providerRef: reference },
    });
    if (!transaction || transaction.tenantId !== tenantId) {
      throw new NotFoundException('Credit purchase not found');
    }
    if (transaction.status !== 'PENDING') {
      return { success: true, status: transaction.status, balance: (await this.getBalance(tenantId)).balance };
    }

    const result = await this.paymentService.verifyPlatformPayment(reference, provider);

    if (result.status === 'success') {
      const balance = await this.applyPurchase(transaction.id, tenantId);
      return { success: true, status: 'COMPLETED', balance };
    }

    await this.prisma.smsCreditTransaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    });

    return { success: true, status: 'FAILED' };
  }

  // Called by webhooks and verify route
  async applyPurchase(transactionId: string, tenantId: string) {
    const transaction = await this.prisma.smsCreditTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Credit purchase not found');
    if (transaction.status === 'COMPLETED') return (await this.getBalance(tenantId)).balance;

    const credit = await this.prisma.smsCredit.upsert({
      where: { tenantId },
      create: { tenantId, balance: transaction.amount, totalPurchased: transaction.amount, totalUsed: 0 },
      update: { balance: { increment: transaction.amount }, totalPurchased: { increment: transaction.amount } },
    });

    await this.prisma.smsCreditTransaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED', balanceAfter: credit.balance, creditId: credit.id },
    });

    this.logger.log(
      `Applied SMS credit purchase ${transaction.id}: +${transaction.amount} for tenant ${tenantId}. Balance: ${credit.balance}`,
    );
    return credit.balance;
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