import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../payment/helpers/crypto.helper';
import axios from 'axios';

@Injectable()
export class PlatformPaymentSettingsService {
  private readonly logger = new Logger(PlatformPaymentSettingsService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.platformPaymentSettings.findFirst();
    if (!settings) {
      return {
        paystackPublicKey: null,
        paystackSecretKey: null,
        paystackWebhookSecret: null,
        flutterwavePublicKey: null,
        flutterwaveSecretKey: null,
        flutterwaveEncryptionKey: null,
        flutterwaveWebhookSecret: null,
        defaultCurrency: 'NGN',
        isActive: true,
      };
    }
    return {
      id: settings.id,
      paystackPublicKey: settings.paystackPublicKey,
      paystackSecretKey: settings.paystackSecretKey ? '••••••••' : null,
      paystackWebhookSecret: settings.paystackWebhookSecret ? '••••••••' : null,
      flutterwavePublicKey: settings.flutterwavePublicKey,
      flutterwaveSecretKey: settings.flutterwaveSecretKey ? '••••••••' : null,
      flutterwaveEncryptionKey: settings.flutterwaveEncryptionKey ? '••••••••' : null,
      flutterwaveWebhookSecret: settings.flutterwaveWebhookSecret ? '••••••••' : null,
      defaultCurrency: settings.defaultCurrency,
      isActive: settings.isActive,
    };
  }

  async getDecryptedSettings() {
    const settings = await this.prisma.platformPaymentSettings.findFirst();
    if (!settings) return null;
    return {
      ...settings,
      paystackSecretKey: settings.paystackSecretKey ? decrypt(settings.paystackSecretKey) : null,
      flutterwaveSecretKey: settings.flutterwaveSecretKey ? decrypt(settings.flutterwaveSecretKey) : null,
      flutterwaveEncryptionKey: settings.flutterwaveEncryptionKey ? decrypt(settings.flutterwaveEncryptionKey) : null,
    };
  }

  async updatePaystack(data: {
    paystackPublicKey?: string;
    paystackSecretKey?: string;
    paystackWebhookSecret?: string;
  }) {
    const existing = await this.prisma.platformPaymentSettings.findFirst();
    const updateData: any = {};
    if (data.paystackPublicKey) updateData.paystackPublicKey = data.paystackPublicKey;
    if (data.paystackSecretKey) updateData.paystackSecretKey = encrypt(data.paystackSecretKey);
    if (data.paystackWebhookSecret) updateData.paystackWebhookSecret = data.paystackWebhookSecret;

    if (existing) {
      return this.prisma.platformPaymentSettings.update({ where: { id: existing.id }, data: updateData });
    }
    return this.prisma.platformPaymentSettings.create({ data: updateData });
  }

  async updateFlutterwave(data: {
    flutterwavePublicKey?: string;
    flutterwaveSecretKey?: string;
    flutterwaveEncryptionKey?: string;
    flutterwaveWebhookSecret?: string;
  }) {
    const existing = await this.prisma.platformPaymentSettings.findFirst();
    const updateData: any = {};
    if (data.flutterwavePublicKey) updateData.flutterwavePublicKey = data.flutterwavePublicKey;
    if (data.flutterwaveSecretKey) updateData.flutterwaveSecretKey = encrypt(data.flutterwaveSecretKey);
    if (data.flutterwaveEncryptionKey) updateData.flutterwaveEncryptionKey = encrypt(data.flutterwaveEncryptionKey);
    if (data.flutterwaveWebhookSecret) updateData.flutterwaveWebhookSecret = data.flutterwaveWebhookSecret;

    if (existing) {
      return this.prisma.platformPaymentSettings.update({ where: { id: existing.id }, data: updateData });
    }
    return this.prisma.platformPaymentSettings.create({ data: updateData });
  }

  async updateGeneral(data: { defaultCurrency?: string; isActive?: boolean }) {
    const existing = await this.prisma.platformPaymentSettings.findFirst();
    const updateData: any = {};
    if (data.defaultCurrency) updateData.defaultCurrency = data.defaultCurrency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (existing) {
      return this.prisma.platformPaymentSettings.update({ where: { id: existing.id }, data: updateData });
    }
    return this.prisma.platformPaymentSettings.create({ data: updateData });
  }

  async validate(provider: 'PAYSTACK' | 'FLUTTERWAVE') {
    const settings = await this.getDecryptedSettings();
    if (!settings) throw new HttpException('Platform payment settings not configured', 404);

    let secretKey: string | null = null;
    let url = '';
    if (provider === 'PAYSTACK') {
      secretKey = settings.paystackSecretKey;
      url = 'https://api.paystack.co/balance';
    } else {
      secretKey = settings.flutterwaveSecretKey;
      url = 'https://api.flutterwave.com/v3/balances';
    }

    if (!secretKey) {
      throw new HttpException(`${provider} platform credentials not configured`, 404);
    }

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      });
      return { success: true, message: `${provider} connected successfully`, data: response.data };
    } catch (error: any) {
      throw new HttpException(
        `Connection failed: ${error.response?.data?.message || error.message}`,
        502,
      );
    }
  }

  async getRevenueSnapshot() {
    const [subscriptionAgg, creditAgg, recentPayments] = await Promise.all([
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: { in: ['SUCCESS', 'PAID'] } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.smsCreditTransaction.aggregate({
        where: { type: 'PURCHASE', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          subscriptionInvoice: { include: { subscription: { include: { tenant: true } } } },
        },
      }),
    ]);

    const platformPayments = recentPayments.filter(
      (p) =>
        p.subscriptionInvoiceId ||
        (p.providerData as any)?.smsCreditTransactionId,
    );
    const creditTxIds = platformPayments
      .filter((p) => !p.subscriptionInvoiceId)
      .map((p) => (p.providerData as any)?.smsCreditTransactionId)
      .filter(Boolean);
    const creditTransactions = creditTxIds.length
      ? await this.prisma.smsCreditTransaction.findMany({
          where: { id: { in: creditTxIds } },
          include: { credit: { include: { tenant: true } } },
        })
      : [];
    const creditTxByIndex = new Map(creditTransactions.map((t) => [t.id, t]));

    const payments = platformPayments.map((p) => {
      const creditTx = !p.subscriptionInvoiceId ? ((p.providerData as any)?.smsCreditTransactionId ? creditTxByIndex.get((p.providerData as any).smsCreditTransactionId) : null) : null;
      return {
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        provider: p.provider,
        status: p.status,
        reference: p.providerRef,
        createdAt: p.createdAt,
        type: p.subscriptionInvoiceId ? 'SUBSCRIPTION' : 'SMS_CREDIT',
        tenantName: p.subscriptionInvoice?.subscription?.tenant?.name || creditTx?.credit?.tenant?.name || null,
      };
    });

    return {
      subscriptionRevenue: subscriptionAgg._sum.amount || 0,
      subscriptionCount: subscriptionAgg._count,
      creditRevenue: creditAgg._sum.amount || 0,
      creditCount: creditAgg._count,
      totalRevenue: (subscriptionAgg._sum.amount || 0) + (creditAgg._sum.amount || 0),
      recentPayments: payments,
    };
  }
}