import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  async calculateTechnicianCommission(techId: string, startDate: Date, endDate: Date) {
    const tech = await this.prisma.user.findUnique({
      where: { id: techId },
      select: { commissionRate: true, commissionType: true, firstName: true, lastName: true },
    });

    if (!tech?.commissionRate) return null;

    const bookings = await this.prisma.booking.findMany({
      where: {
        technicianId: techId,
        status: 'COMPLETED',
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        invoices: { include: { payments: { where: { status: 'SUCCESS' } } } },
        service: { select: { name: true, price: true } },
      },
    });

    let totalRevenue = 0;
    let commissionAmount = 0;
    const details = bookings.map(b => {
      const paidAmount = b.invoices?.[0]?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      totalRevenue += paidAmount;
      const commission = tech.commissionType === 'FIXED'
        ? (tech.commissionRate || 0)
        : (paidAmount * (tech.commissionRate || 0) / 100);
      commissionAmount += commission;
      return {
        bookingId: b.id,
        service: b.service?.name,
        date: b.startTime,
        revenue: paidAmount,
        commission,
      };
    });

    return {
      technician: `${tech.firstName} ${tech.lastName}`,
      rate: tech.commissionRate,
      type: tech.commissionType,
      totalBookings: bookings.length,
      totalRevenue,
      commissionAmount,
      details,
    };
  }

  async getAllCommissions(tenantId: string, startDate: Date, endDate: Date) {
    const techs = await this.prisma.user.findMany({
      where: { tenantId, role: 'TECHNICIAN', isActive: true, commissionRate: { not: null } },
    });
    const results = await Promise.all(
      techs.map(t => this.calculateTechnicianCommission(t.id, startDate, endDate))
    );
    return results.filter(Boolean);
  }

  async getSummary(tenantId: string, startDate: Date, endDate: Date) {
    const all = await this.getAllCommissions(tenantId, startDate, endDate) as any[];
    return {
      totalCommission: all.reduce((s, r) => s + r.commissionAmount, 0),
      totalRevenue: all.reduce((s, r) => s + r.totalRevenue, 0),
      technicians: all.length,
      averageCommissionRate: all.length > 0 ? all.reduce((s, r) => s + r.rate, 0) / all.length : 0,
    };
  }
}
