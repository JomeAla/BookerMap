import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingRuleType } from '@prisma/client';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePricingRuleDto) {
    return this.prisma.pricingRule.create({
      data: {
        ...dto,
        daysOfWeek: dto.daysOfWeek ?? undefined,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.pricingRule.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const rule = await this.prisma.pricingRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return rule;
  }

  async update(tenantId: string, id: string, dto: UpdatePricingRuleDto) {
    await this.findById(tenantId, id);
    return this.prisma.pricingRule.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.pricingRule.delete({ where: { id } });
    return { success: true };
  }

  async getActiveRules(tenantId: string, serviceId?: string) {
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (!serviceId) return rules;
    return rules.filter(r => !r.serviceId || r.serviceId === serviceId);
  }

  async applyPricing(
    tenantId: string,
    servicePrice: number,
    serviceId: string,
    bookingDateTime: Date,
  ): Promise<{ finalPrice: number; appliedRules: { id: string; name: string; type: string; adjustmentValue: number }[] }> {
    const rules = await this.getActiveRules(tenantId, serviceId);
    const now = new Date();
    let price = servicePrice;
    const appliedRules: { id: string; name: string; type: string; adjustmentValue: number }[] = [];

    for (const rule of rules) {
      let matches = true;

      if (rule.daysOfWeek) {
        const days = rule.daysOfWeek as string[];
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const bookingDay = dayNames[bookingDateTime.getDay()];
        if (!days.includes(bookingDay)) matches = false;
      }

      if (matches && rule.startTime && rule.endTime) {
        const timeStr = `${String(bookingDateTime.getHours()).padStart(2, '0')}:${String(bookingDateTime.getMinutes()).padStart(2, '0')}`;
        if (timeStr < rule.startTime || timeStr > rule.endTime) matches = false;
      }

      if (matches && rule.minHoursBeforeBooking != null) {
        const hoursDiff = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > rule.minHoursBeforeBooking) matches = false;
      }

      if (matches) {
        if (rule.adjustmentType === 'PERCENTAGE') {
          price += price * (rule.adjustmentValue / 100);
        } else {
          price += rule.adjustmentValue;
        }
        appliedRules.push({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          adjustmentValue: rule.adjustmentValue,
        });
      }
    }

    return { finalPrice: Math.max(0, price), appliedRules };
  }
}
