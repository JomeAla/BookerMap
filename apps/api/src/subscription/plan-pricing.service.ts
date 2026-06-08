import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

@Injectable()
export class PlanPricingService {
  private readonly logger = new Logger(PlanPricingService.name);

  constructor(private prisma: PrismaService) {}

  async listPlans() {
    return this.prisma.planPricing.findMany({ orderBy: [{ plan: 'asc' }, { billingCycle: 'asc' }] });
  }

  async getPlan(plan: SubscriptionPlan, billingCycle: BillingCycle) {
    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan, billingCycle } },
    });
    if (!pricing) throw new NotFoundException(`Plan ${plan}/${billingCycle} not found`);
    return pricing;
  }

  async upsertPlan(data: {
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    price: number;
    smsCredits?: number;
    whatsappCredits?: number;
    features?: any;
    isActive?: boolean;
  }) {
    return this.prisma.planPricing.upsert({
      where: { plan_billingCycle: { plan: data.plan, billingCycle: data.billingCycle } },
      update: {
        price: data.price,
        smsCredits: data.smsCredits ?? 0,
        whatsappCredits: data.whatsappCredits ?? 0,
        features: data.features ?? undefined,
        isActive: data.isActive ?? true,
      },
      create: {
        plan: data.plan,
        billingCycle: data.billingCycle,
        price: data.price,
        smsCredits: data.smsCredits ?? 0,
        whatsappCredits: data.whatsappCredits ?? 0,
        features: data.features ?? undefined,
        isActive: data.isActive ?? true,
      },
    });
  }

  async deletePlan(plan: SubscriptionPlan, billingCycle: BillingCycle) {
    const pricing = await this.prisma.planPricing.findUnique({
      where: { plan_billingCycle: { plan, billingCycle } },
    });
    if (!pricing) throw new NotFoundException(`Plan ${plan}/${billingCycle} not found`);
    return this.prisma.planPricing.delete({ where: { id: pricing.id } });
  }

  async seedDefaults() {
    const defaults = [
      { plan: SubscriptionPlan.FREE, billingCycle: BillingCycle.MONTHLY, price: 0, smsCredits: 50, whatsappCredits: 50, features: { maxUsers: 3, maxBookings: 50, aiChat: true, analytics: false } },
      { plan: SubscriptionPlan.BASIC, billingCycle: BillingCycle.MONTHLY, price: 4999, smsCredits: 500, whatsappCredits: 500, features: { maxUsers: 10, maxBookings: 500, aiChat: true, analytics: true } },
      { plan: SubscriptionPlan.BASIC, billingCycle: BillingCycle.YEARLY, price: 49990, smsCredits: 6000, whatsappCredits: 6000, features: { maxUsers: 10, maxBookings: 500, aiChat: true, analytics: true } },
      { plan: SubscriptionPlan.PRO, billingCycle: BillingCycle.MONTHLY, price: 14999, smsCredits: 2000, whatsappCredits: 2000, features: { maxUsers: 50, maxBookings: 2000, aiChat: true, analytics: true, customDomain: true, prioritySupport: true } },
      { plan: SubscriptionPlan.PRO, billingCycle: BillingCycle.YEARLY, price: 149990, smsCredits: 24000, whatsappCredits: 24000, features: { maxUsers: 50, maxBookings: 2000, aiChat: true, analytics: true, customDomain: true, prioritySupport: true } },
      { plan: SubscriptionPlan.ENTERPRISE, billingCycle: BillingCycle.MONTHLY, price: 49999, smsCredits: 10000, whatsappCredits: 10000, features: { maxUsers: -1, maxBookings: -1, aiChat: true, analytics: true, customDomain: true, prioritySupport: true, whiteLabel: true, api: true } },
      { plan: SubscriptionPlan.ENTERPRISE, billingCycle: BillingCycle.YEARLY, price: 499990, smsCredits: 120000, whatsappCredits: 120000, features: { maxUsers: -1, maxBookings: -1, aiChat: true, analytics: true, customDomain: true, prioritySupport: true, whiteLabel: true, api: true } },
    ];

    let created = 0;
    for (const d of defaults) {
      try {
        await this.upsertPlan(d);
        created++;
      } catch (e: any) {
        this.logger.warn(`Skipping plan ${d.plan}/${d.billingCycle}: ${e.message}`);
      }
    }
    return { seeded: created, total: defaults.length };
  }
}