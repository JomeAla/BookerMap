import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './providers/paystack.service';
import { FlutterwaveService } from './providers/flutterwave.service';

@Injectable()
export class RecurringPaymentService {
  private readonly logger = new Logger(RecurringPaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.recurringPayment.findMany({
      where: { tenantId },
      include: { customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }, service: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const rp = await this.prisma.recurringPayment.findFirst({
      where: { id, tenantId },
      include: { customer: true, service: true, recurringPaymentLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!rp) throw new NotFoundException('Recurring payment not found');
    return rp;
  }

  async toggle(tenantId: string, id: string) {
    const rp = await this.prisma.recurringPayment.findFirst({ where: { id, tenantId } });
    if (!rp) throw new NotFoundException('Recurring payment not found');
    return this.prisma.recurringPayment.update({
      where: { id },
      data: { isActive: !rp.isActive },
    });
  }

  async getLogs(tenantId: string, id: string) {
    const rp = await this.prisma.recurringPayment.findFirst({ where: { id, tenantId } });
    if (!rp) throw new NotFoundException('Recurring payment not found');
    return this.prisma.recurringPaymentLog.findMany({
      where: { recurringPaymentId: id },
      include: { invoice: { select: { id: true, invoiceNumber: true } }, payment: { select: { id: true, status: true, providerRef: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private getNextPaymentDate(frequency: string, from: Date): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'DAILY': next.setDate(next.getDate() + 1); break;
      case 'WEEKLY': next.setDate(next.getDate() + 7); break;
      case 'BIWEEKLY': next.setDate(next.getDate() + 14); break;
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
      case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
      case 'YEARLY': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processDuePayments() {
    this.logger.log('Processing due recurring payments...');

    const now = new Date();
    const duePayments = await this.prisma.recurringPayment.findMany({
      where: { isActive: true, nextPaymentAt: { lte: now } },
      include: {
        tenant: { select: { id: true, currency: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Found ${duePayments.length} due recurring payments`);

    for (const rp of duePayments) {
      try {
        const provider = rp.paymentMethod === 'FLUTTERWAVE' ? this.flutterwaveService : this.paystackService;
        const currency: string = (rp.tenant?.currency || 'NGN') as string;

        const metadata = rp.metadata as Record<string, any> | null;
        const authorizationCode = metadata?.authorizationCode as string | undefined;
        if (!authorizationCode) {
          this.logger.warn(`Recurring payment ${rp.id} has no authorizationCode in metadata, skipping`);
          await this.createLog(rp.id, rp.tenantId, 'FAILED', now, 'No authorization code in metadata');
          continue;
        }

        const email = rp.customer.email || 'unknown@recurring.payment';
        const result = await provider.chargeCustomer(
          email,
          rp.amount,
          authorizationCode,
          rp.tenantId,
        );

        const success = result?.status === true || result?.status === 'success';

        if (success) {
          const reference = result?.data?.reference || result?.data?.id || `RP-${rp.id}-${Date.now()}`;

          const invoice = await this.prisma.invoice.create({
            data: {
              tenantId: rp.tenantId,
              customerId: rp.customerId,
              invoiceNumber: `RINV-${rp.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
              subtotal: rp.amount,
              total: rp.amount,
              currency,
              status: 'PAID',
              dueDate: now,
              paidAt: now,
            },
          });

          const payment = await this.prisma.payment.create({
            data: {
              amount: rp.amount,
              currency,
              status: 'SUCCESS',
              provider: rp.paymentMethod as any,
              providerRef: reference,
              invoiceId: invoice.id,
            },
          });

          await this.createLog(rp.id, rp.tenantId, 'SUCCESS', now, `Charged ${currency} ${(rp.amount / 100).toFixed(2)}`, invoice.id, payment.id, reference);
        } else {
          const reason = result?.message || result?.data?.message || 'Charge failed';
          await this.createLog(rp.id, rp.tenantId, 'FAILED', now, reason, undefined, undefined, undefined, result);
        }

        const nextDate = this.getNextPaymentDate(rp.frequency, now);
        await this.prisma.recurringPayment.update({
          where: { id: rp.id },
          data: {
            nextPaymentAt: success ? nextDate : now,
            ...(rp.endDate && nextDate > rp.endDate ? { isActive: false } : {}),
          },
        });

        this.logger.log(`Recurring payment ${rp.id} (${rp.customer.email}): ${success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        this.logger.error(`Recurring payment ${rp.id} failed with exception: ${error instanceof Error ? error.message : error}`);
        await this.createLog(rp.id, rp.tenantId, 'FAILED', now, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    this.logger.log('Recurring payment processing completed');
  }

  private async createLog(
    recurringPaymentId: string,
    tenantId: string,
    status: string,
    processedAt: Date,
    failureReason?: string,
    invoiceId?: string,
    paymentId?: string,
    reference?: string,
    metadata?: any,
  ) {
    return this.prisma.recurringPaymentLog.create({
      data: {
        recurringPaymentId,
        tenantId,
        amount: 0,
        status,
        processedAt,
        failureReason,
        invoiceId: invoiceId || null,
        paymentId: paymentId || null,
      },
    });
  }
}
