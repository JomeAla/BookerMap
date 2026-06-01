import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SplitPaymentService {
  private readonly logger = new Logger(SplitPaymentService.name);

  constructor(private prisma: PrismaService) {}

  async createSplitPayment(bookingId: string, invoiceId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true, invoices: { include: { payments: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const tenant = booking.tenant;
    const platformRate = tenant.platformFeeRate ?? 10;

    let providerId: string | null = booking.technicianId;
    if (!providerId) {
      const dispatch = await this.prisma.dispatch.findUnique({
        where: { bookingId },
        select: { assignedToId: true },
      });
      providerId = dispatch ? dispatch.assignedToId : null;
    }
    if (!providerId) throw new BadRequestException('No provider assigned to this booking');

    const paidInvoice = invoiceId
      ? booking.invoices.find(i => i.id === invoiceId && i.status === 'PAID')
      : booking.invoices.find(i => i.status === 'PAID');

    if (!paidInvoice) throw new BadRequestException('No paid invoice found for this booking');

    const totalAmount = paidInvoice.total;
    const platformFee = Math.round((totalAmount * platformRate) / 100 * 100) / 100;
    const providerAmount = Math.round((totalAmount - platformFee) * 100) / 100;

    const existing = await this.prisma.splitPayment.findFirst({
      where: { bookingId, invoiceId: paidInvoice.id },
    });
    if (existing) throw new BadRequestException('Split payment already exists for this booking/invoice');

    const split = await this.prisma.splitPayment.create({
      data: {
        tenantId: booking.tenantId,
        bookingId,
        invoiceId: paidInvoice.id,
        providerId,
        totalAmount,
        platformFee,
        providerAmount,
        platformRate,
      },
      include: {
        booking: { include: { customer: true, service: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        invoice: true,
      },
    });

    this.logger.log(`SplitPayment created: ${split.id} for booking ${bookingId}`);

    return split;
  }

  async releasePayment(splitPaymentId: string) {
    const split = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
    });
    if (!split) throw new NotFoundException('Split payment not found');
    if (split.status !== 'PENDING') throw new BadRequestException('Only pending payments can be released');

    return this.prisma.splitPayment.update({
      where: { id: splitPaymentId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }

  async holdPayment(splitPaymentId: string) {
    const split = await this.prisma.splitPayment.findUnique({
      where: { id: splitPaymentId },
    });
    if (!split) throw new NotFoundException('Split payment not found');
    if (split.status === 'RELEASED') throw new BadRequestException('Cannot hold a released payment');

    return this.prisma.splitPayment.update({
      where: { id: splitPaymentId },
      data: { status: 'ON_HOLD' },
    });
  }

  async getTenantSplitPayments(
    tenantId: string,
    filters?: { status?: string; providerId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.providerId) where.providerId = filters.providerId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    return this.prisma.splitPayment.findMany({
      where,
      include: {
        booking: { include: { customer: true, service: true } },
        provider: { select: { id: true, firstName: true, lastName: true, email: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProviderSplitPayments(
    providerId: string,
    filters?: { status?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = { providerId };
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const payments = await this.prisma.splitPayment.findMany({
      where,
      include: {
        booking: { include: { customer: true, service: true } },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = payments.reduce(
      (acc, p) => {
        acc.totalAmount += p.totalAmount;
        acc.platformFee += p.platformFee;
        acc.providerAmount += p.providerAmount;
        if (p.status === 'RELEASED') acc.released += p.providerAmount;
        if (p.status === 'PENDING') acc.pending += p.providerAmount;
        return acc;
      },
      { totalAmount: 0, platformFee: 0, providerAmount: 0, released: 0, pending: 0, count: payments.length },
    );

    return { payments, totals };
  }

  async getPlatformRevenue(
    tenantId: string,
    dateRange?: { startDate?: string; endDate?: string },
  ) {
    const where: any = { tenantId };
    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) where.createdAt.lte = new Date(dateRange.endDate);
    }

    const payments = await this.prisma.splitPayment.findMany({ where });

    const totalRevenue = payments.reduce((s, p) => s + p.totalAmount, 0);
    const totalFees = payments.reduce((s, p) => s + p.platformFee, 0);
    const totalPayouts = payments.reduce((s, p) => s + p.providerAmount, 0);
    const pendingFees = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.platformFee, 0);
    const releasedFees = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + p.platformFee, 0);
    const onHoldFees = payments.filter(p => p.status === 'ON_HOLD').reduce((s, p) => s + p.platformFee, 0);

    return {
      totalRevenue,
      totalFees,
      totalPayouts,
      pendingFees,
      releasedFees,
      onHoldFees,
      totalTransactions: payments.length,
      averageFeeRate: payments.length > 0 ? totalFees / totalRevenue * 100 : 0,
    };
  }

  async getProviderEarningsSummary(providerId: string) {
    const where = { providerId };

    const payments = await this.prisma.splitPayment.findMany({ where });

    const totalEarned = payments.reduce((s, p) => s + p.providerAmount, 0);
    const pending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.providerAmount, 0);
    const released = payments.filter(p => p.status === 'RELEASED').reduce((s, p) => s + p.providerAmount, 0);
    const onHold = payments.filter(p => p.status === 'ON_HOLD').reduce((s, p) => s + p.providerAmount, 0);

    return { totalEarned, pending, released, onHold, totalTransactions: payments.length };
  }
}
