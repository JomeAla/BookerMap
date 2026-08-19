import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async getActiveSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!subscription) {
      return this.createDefaultSubscription(tenantId);
    }
    return subscription;
  }

  async getAllSubscriptions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { id: true, name: true, slug: true, logo: true } } },
      }),
      this.prisma.subscription.count(),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createSubscription(tenantId: string, dto: { plan: SubscriptionPlan; billingCycle?: BillingCycle; price?: number; trialEndsAt?: string }) {
    const existing = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (existing) {
      throw new BadRequestException('Tenant already has a subscription');
    }

    const plan = dto.plan || SubscriptionPlan.FREE;
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, billingCycle);

    // Price comes from the admin-managed PlanPricing table (single source of truth)
    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan, billingCycle } },
    });
    const price = dto.price !== undefined ? dto.price : pricing?.price ?? PLAN_DEFAULT_PRICES[plan];

    return this.prisma.subscription.create({
      data: {
        tenantId,
        plan,
        billingCycle,
        price,
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  async updatePlan(tenantId: string, plan: SubscriptionPlan, billingCycle?: BillingCycle) {
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') {
      throw new BadRequestException('Cannot change plan on a canceled or expired subscription');
    }

    const cycle = billingCycle || subscription.billingCycle;
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, cycle);

    // Price comes from the admin-managed PlanPricing table (single source of truth)
    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan, billingCycle: cycle } },
    });
    const price = pricing?.price ?? PLAN_DEFAULT_PRICES[plan];

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        plan,
        billingCycle: cycle,
        price,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: 'ACTIVE',
      },
    });
  }

  async checkout(
    tenantId: string,
    dto: { plan: SubscriptionPlan; billingCycle?: BillingCycle; provider?: 'PAYSTACK' | 'FLUTTERWAVE' },
  ) {
    const existing = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!existing) {
      throw new NotFoundException('Subscription not found. Contact support.');
    }
    if (existing.status === 'CANCELED') {
      throw new BadRequestException('Cannot upgrade a canceled subscription');
    }

    const plan = dto.plan;
    const billingCycle = dto.billingCycle || existing.billingCycle;

    // FREE plan never requires payment — activate immediately
    if (plan === SubscriptionPlan.FREE) {
      await this.updatePlan(tenantId, plan, billingCycle);
      return { success: true, free: true, subscription: await this.getActiveSubscription(tenantId) };
    }

    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan, billingCycle } },
    });
    if (!pricing) {
      throw new BadRequestException(`No pricing configured for ${plan}/${billingCycle}`);
    }
    const amount = Math.round(pricing.price);

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, role: { in: ['ADMIN', 'OWNER', 'PLATFORM_ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });
    const email = adminUser?.email || tenant?.slug + '@bookermap.local';

    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: existing.id,
        tenantId,
        amount,
        currency: tenant?.currency || 'NGN',
        status: 'PENDING',
        dueDate: new Date(),
      },
    });

    const result = await this.paymentService.initializePlatformPayment(
      email,
      amount,
      {
        subscriptionInvoiceId: invoice.id,
        plan: plan as string,
        billingCycle: billingCycle as string,
        title: `BookerMap ${plan} ${billingCycle} subscription`,
        description: `Subscription for ${tenant?.name || 'tenant'}`,
      },
      dto.provider,
      tenant?.currency || 'NGN',
    );

    await this.prisma.payment.create({
      data: {
        amount,
        currency: tenant?.currency || 'NGN',
        status: 'PENDING',
        provider: (dto.provider || 'PAYSTACK') as any,
        providerRef: result.reference,
        subscriptionInvoiceId: invoice.id,
      },
    });

    return {
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        accessCode: result.accessCode,
        invoiceId: invoice.id,
        amount,
        currency: tenant?.currency || 'NGN',
        email,
      },
    };
  }

  async verifyCheckout(reference: string, tenantId: string, provider?: 'PAYSTACK' | 'FLUTTERWAVE') {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference },
      include: { subscriptionInvoice: true },
    });
    if (!payment || !payment.subscriptionInvoice || payment.subscriptionInvoice.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'PENDING') {
      return { success: true, status: payment.status, subscription: await this.getActiveSubscription(tenantId) };
    }

    const result = await this.paymentService.verifyPlatformPayment(reference, provider);

    if (result.status === 'success') {
      const updated = await this.finalizeSubscriptionPayment(payment.id, payment.subscriptionInvoice.id, tenantId, result.customer);
      return { success: true, status: 'SUCCESS', subscription: updated };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: result },
    });

    return { success: true, status: 'FAILED' };
  }

  async finalizeSubscriptionPayment(paymentId: string, subscriptionInvoiceId: string, tenantId: string, providerData?: any) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: subscriptionInvoiceId },
      include: { subscription: true },
    });
    if (!invoice) throw new NotFoundException('Subscription invoice not found');

    const subscription = invoice.subscription;
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, invoice.subscription.billingCycle);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: now, reference: invoice.reference, provider: invoice.provider },
      });

      const sub = await tx.subscription.update({
        where: { tenantId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'SUCCESS', providerData },
      });

      return sub;
    });

    this.logger.log(`Subscription invoice ${invoice.id} paid. Tenant ${tenantId} now ACTIVE (${subscription.plan})`);
    return updated;
  }

  async cancelSubscription(tenantId: string, immediate: boolean = false) {
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (immediate) {
      return this.prisma.subscription.update({
        where: { tenantId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    }

    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        canceledAt: new Date(),
        status: 'ACTIVE',
      },
    });
  }

  async getSubscriptionInvoices(tenantId: string) {
    return this.prisma.subscriptionInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { subscription: { select: { plan: true } }, payments: true },
    });
  }

  async generateInvoice(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId,
        tenantId: subscription.tenantId,
        amount: subscription.price,
        currency: 'NGN',
        status: 'PENDING',
        dueDate: subscription.currentPeriodEnd,
      },
    });
  }

  // Cron: bill renewals for ACTIVE paid subscriptions whose period ended
  async processRenewals() {
    this.logger.log('Processing subscription renewals...');
    const now = new Date();

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { not: 'FREE' },
        currentPeriodEnd: { lt: now },
      },
      include: { tenant: true },
    });

    let renewed = 0;
    for (const subscription of dueSubscriptions) {
      try {
        await this.renewSubscription(subscription.id);
        renewed++;
      } catch (e: any) {
        this.logger.warn(`Renewal failed for subscription ${subscription.id}: ${e.message}`);
      }
    }

    this.logger.log(`Processed ${renewed}/${dueSubscriptions.length} subscription renewals`);
    return { processed: dueSubscriptions.length, renewed };
  }

  private async renewSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });
    if (!subscription) return;

    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan: subscription.plan, billingCycle: subscription.billingCycle } },
    });
    const amount = Math.round(pricing?.price ?? subscription.price);

    // Generate PENDING invoice as a bill; auto-charge is optional (card on file) — keep simple: mark invoice
    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId,
        tenantId: subscription.tenantId,
        amount,
        currency: subscription.tenant?.currency || 'NGN',
        status: 'PENDING',
        dueDate: subscription.currentPeriodEnd,
      },
    });

    this.logger.log(`Created renewal invoice ${invoice.id} for subscription ${subscriptionId} (${amount})`);
    return invoice;
  }

  async checkExpirations() {
    this.logger.log('Checking subscription expirations...');
    const now = new Date();

    const expired = await this.prisma.subscription.updateMany({
      where: {
        status: 'PAST_DUE',
        plan: { not: 'FREE' },
      },
      data: { status: 'EXPIRED' as any },
    });

    this.logger.log(`Marked ${expired.count} subscriptions as EXPIRED`);
    return expired;
  }

  private async createDefaultSubscription(tenantId: string) {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.create({
      data: {
        tenantId,
        plan: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        price: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    if (cycle === 'MONTHLY') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    return end;
  }
}

// Fallback defaults when PlanPricing row does not exist (should rarely be used)
const PLAN_DEFAULT_PRICES: Record<SubscriptionPlan, number> = {
  FREE: 0,
  BASIC: 4999,
  PRO: 14999,
  ENTERPRISE: 49999,
};