import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementStatus } from '@prisma/client';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(private prisma: PrismaService) {}

  async generateSettlement(tenantId: string, providerId: string, periodStart: string, periodEnd: string) {
    const provider = await this.prisma.user.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const splitPayments = await this.prisma.splitPayment.findMany({
      where: {
        tenantId,
        providerId,
        status: 'RELEASED',
        settledAt: null,
        releasedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        booking: { include: { service: true, customer: true } },
      },
    });

    if (splitPayments.length === 0) {
      throw new BadRequestException('No unreconciled split payments found in this period');
    }

    const totalEarned = Math.round(splitPayments.reduce((s, p) => s + p.totalAmount, 0) * 100) / 100;
    const totalFee = Math.round(splitPayments.reduce((s, p) => s + p.platformFee, 0) * 100) / 100;
    const netAmount = Math.round((totalEarned - totalFee) * 100) / 100;

    const settlement = await this.prisma.settlement.create({
      data: {
        tenantId,
        providerId,
        periodStart: start,
        periodEnd: end,
        totalEarned,
        totalFee,
        netAmount,
        status: SettlementStatus.PENDING,
        lineItems: {
          create: splitPayments.map(sp => ({
            splitPaymentId: sp.id,
            bookingId: sp.bookingId,
            amount: sp.providerAmount,
            description: `Booking ${sp.bookingId.slice(0, 8)} - ${sp.booking?.service?.name || 'Service'}`,
          })),
        },
      },
      include: {
        provider: { select: { id: true, firstName: true, lastName: true, email: true } },
        lineItems: true,
      },
    });

    await this.prisma.splitPayment.updateMany({
      where: { id: { in: splitPayments.map(sp => sp.id) } },
      data: { settledAt: new Date() },
    });

    this.logger.log(`Settlement generated: ${settlement.id} for provider ${providerId}`);
    return settlement;
  }

  async getSettlements(tenantId: string, filters?: {
    status?: string;
    providerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.providerId) where.providerId = filters.providerId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    return this.prisma.settlement.findMany({
      where,
      include: {
        provider: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSettlementById(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        provider: { select: { id: true, firstName: true, lastName: true, email: true } },
        lineItems: {
          include: {
            splitPayment: {
              select: { id: true, totalAmount: true, platformFee: true, providerAmount: true, status: true, createdAt: true },
            },
            booking: {
              select: { id: true, startTime: true, totalPrice: true, status: true, service: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return settlement;
  }

  async getProviderSettlements(providerId: string, tenantId: string) {
    return this.prisma.settlement.findMany({
      where: { providerId, tenantId },
      include: {
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsProcessing(id: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException('Only pending settlements can be marked as processing');
    }

    return this.prisma.settlement.update({
      where: { id },
      data: { status: SettlementStatus.PROCESSING },
    });
  }

  async markAsCompleted(id: string, paymentMethod: string, paymentReference: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status !== SettlementStatus.PROCESSING && settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException('Settlement must be pending or processing to complete');
    }

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.COMPLETED,
        paidAt: new Date(),
        paymentMethod,
        paymentReference,
      },
    });
  }

  async markAsFailed(id: string, notes: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Cannot fail a completed settlement');
    }

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.FAILED,
        notes,
      },
    });
  }

  async getSettlementSummary(tenantId: string) {
    const settlements = await this.prisma.settlement.findMany({
      where: { tenantId },
    });

    const totalOutstanding = settlements
      .filter(s => s.status === SettlementStatus.PENDING)
      .reduce((s, x) => s + x.netAmount, 0);

    const totalProcessing = settlements
      .filter(s => s.status === SettlementStatus.PROCESSING)
      .reduce((s, x) => s + x.netAmount, 0);

    const totalCompleted = settlements
      .filter(s => s.status === SettlementStatus.COMPLETED)
      .reduce((s, x) => s + x.netAmount, 0);

    const totalFailed = settlements
      .filter(s => s.status === SettlementStatus.FAILED)
      .reduce((s, x) => s + x.netAmount, 0);

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalProcessing: Math.round(totalProcessing * 100) / 100,
      totalCompleted: Math.round(totalCompleted * 100) / 100,
      totalFailed: Math.round(totalFailed * 100) / 100,
      totalSettlements: settlements.length,
      pendingCount: settlements.filter(s => s.status === SettlementStatus.PENDING).length,
      processingCount: settlements.filter(s => s.status === SettlementStatus.PROCESSING).length,
      completedCount: settlements.filter(s => s.status === SettlementStatus.COMPLETED).length,
      failedCount: settlements.filter(s => s.status === SettlementStatus.FAILED).length,
    };
  }

  async getProviderOutstanding(tenantId: string, providerId: string) {
    const unreconciled = await this.prisma.splitPayment.findMany({
      where: {
        tenantId,
        providerId,
        status: 'RELEASED',
        settledAt: null,
      },
      include: {
        booking: { select: { id: true, startTime: true, service: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalProviderAmount = Math.round(unreconciled.reduce((s, p) => s + p.providerAmount, 0) * 100) / 100;
    const totalPlatformFee = Math.round(unreconciled.reduce((s, p) => s + p.platformFee, 0) * 100) / 100;

    return {
      totalOutstanding: totalProviderAmount,
      totalPlatformFee,
      paymentCount: unreconciled.length,
      payments: unreconciled,
    };
  }
}
