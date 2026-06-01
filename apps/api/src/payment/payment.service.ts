import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { PaystackService } from './providers/paystack.service';
import { FlutterwaveService } from './providers/flutterwave.service';
import { PaymentProvider } from './interfaces/payment.interface';
import { PaymentStatus, PaymentProvider as PaymentProviderEnum } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
    private webhookService: WebhookService,
  ) {}

  async getProviderForTenant(tenantId: string, preferredProvider?: 'PAYSTACK' | 'FLUTTERWAVE'): Promise<{
    provider: PaymentProvider;
    providerName: 'PAYSTACK' | 'FLUTTERWAVE';
  }> {
    if (preferredProvider) {
      const settings = await this.prisma.paymentSettings.findUnique({
        where: { tenantId_provider: { tenantId, provider: preferredProvider } },
      });
      if (settings?.isActive) {
        return {
          provider: preferredProvider === 'PAYSTACK' ? this.paystackService : this.flutterwaveService,
          providerName: preferredProvider,
        };
      }
    }

    const activeSettings = await this.prisma.paymentSettings.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSettings) {
      throw new HttpException('No active payment provider configured for this tenant', 400);
    }

    return {
      provider: activeSettings.provider === 'PAYSTACK' ? this.paystackService : this.flutterwaveService,
      providerName: activeSettings.provider as 'PAYSTACK' | 'FLUTTERWAVE',
    };
  }

  async initializePayment(
    email: string,
    amount: number,
    metadata: any,
    tenantId: string,
    providerName?: 'PAYSTACK' | 'FLUTTERWAVE',
  ) {
    const { provider, providerName: resolvedProvider } = await this.getProviderForTenant(tenantId, providerName);
    return provider.initializePayment(email, amount, { ...metadata, provider: resolvedProvider }, tenantId);
  }

  async verifyPayment(reference: string, tenantId: string) {
    const { provider } = await this.getProviderForTenant(tenantId);
    return provider.verifyPayment(reference, tenantId);
  }

  async getPaymentHistory(
    tenantId: string,
    filters: { invoiceId?: string; status?: PaymentStatus; provider?: PaymentProviderEnum; page?: number; limit?: number },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      invoice: { tenantId },
    };
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.status) where.status = filters.status;
    if (filters.provider) where.provider = filters.provider;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { invoice: { include: { customer: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(id: string, tenantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, invoice: { tenantId } },
      include: { invoice: { include: { customer: true, lineItems: true } } },
    });
    if (!payment) {
      throw new HttpException('Payment not found', 404);
    }
    return payment;
  }

  async handlePaymentSuccess(paymentId: string, invoiceId: string, tenantId: string, providerData?: any) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new HttpException('Payment not found', 404);
    if (payment.status === 'SUCCESS') return payment;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        providerData: providerData || undefined,
      },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new HttpException('Invoice not found', 404);

    const newPaidAmount = invoice.paidAmount + payment.amount;
    const isFullyPaid = newPaidAmount >= invoice.total;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: isFullyPaid ? new Date() : undefined,
      },
    });

    this.logger.log(
      `Payment ${paymentId}: ${payment.amount} applied to invoice ${invoiceId}. ` +
      `Paid: ${newPaidAmount}/${invoice.total} (${isFullyPaid ? 'Fully Paid' : 'Partial'})`,
    );

    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
  }

  async refundPayment(paymentId: string, amount: number | undefined, tenantId: string): Promise<any> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { tenantId } },
    });
    if (!payment) throw new HttpException('Payment not found', 404);
    if (payment.status !== 'SUCCESS') throw new HttpException('Only successful payments can be refunded', 400);

    const refundAmount = amount || payment.amount;
    const provider = payment.provider === 'PAYSTACK' ? this.paystackService : this.flutterwaveService;
    const result = await provider.refund(payment.providerRef!, refundAmount, tenantId);

    const newStatus = amount && amount < payment.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus as any },
    });

    if (newStatus === 'REFUNDED') {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: payment.invoiceId },
      });
      const newPaidAmount = Math.max(0, (invoice?.paidAmount || 0) - payment.amount);
      await this.prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newPaidAmount <= 0 ? 'SENT' : 'PARTIALLY_PAID',
          paidAmount: newPaidAmount,
          paidAt: newPaidAmount <= 0 ? null : undefined,
        },
      });
    }

    this.webhookService.dispatchEvent(tenantId, 'payment.refunded', { paymentId, amount: refundAmount, status: newStatus })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    return result;
  }

  async initiatePOSPayment(tenantId: string, data: { amount: number; terminalId?: string; provider: string; invoiceId?: string; bookingId?: string }) {
    const reference = `BMR-POS-${tenantId.slice(0, 6)}-${Date.now()}`.toUpperCase();

    if (data.provider === 'paystack') {
      const result = await this.paystackService.initializeTerminalTransaction(
        data.amount,
        'pos@bookermap.com',
        data.terminalId || 'TML-001',
        tenantId,
      );
      return { reference: result.reference, timeout: result.timeout };
    }

    const result = await this.flutterwaveService.initiatePOSCharge(data.amount, 'pos@bookermap.com');
    return { reference: result.reference, note: result.note };
  }

  async verifyPOSPayment(tenantId: string, reference: string) {
    const provider = await this.getProviderForTenant(tenantId);
    if (provider.providerName === 'PAYSTACK') {
      return this.paystackService.checkTerminalStatus(reference, tenantId);
    }
    return this.flutterwaveService.verifyPOSCharge(reference);
  }
}
