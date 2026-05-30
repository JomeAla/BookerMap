import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

const PLAN_PRICES: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  BASIC: { monthly: 9900, yearly: 99900 },
  PRO: { monthly: 29900, yearly: 299900 },
  ENTERPRISE: { monthly: 99900, yearly: 999900 },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

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
    const price = dto.price ?? PLAN_PRICES[plan][billingCycle.toLowerCase() as 'monthly' | 'yearly'];
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, billingCycle);

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
    const price = PLAN_PRICES[plan][cycle.toLowerCase() as 'monthly' | 'yearly'];
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, cycle);

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
      include: { subscription: { select: { plan: true } } },
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

  async checkExpirations() {
    this.logger.log('Checking subscription expirations...');
    const now = new Date();

    const expired = await this.prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lt: now },
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
