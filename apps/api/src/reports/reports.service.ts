import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBookings, totalCustomers, pendingInvoices, revenueResult] = await Promise.all([
      this.prisma.booking.count({
        where: { tenantId, startTime: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.invoice.count({
        where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
      }),
      this.prisma.payment.aggregate({
        where: { invoice: { tenantId }, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    return {
      todayBookings,
      revenue: revenueResult._sum.amount || 0,
      totalCustomers,
      pendingInvoices,
    };
  }

  async getRevenueReport(tenantId: string, startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        invoice: { tenantId },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { amount: true, fee: true, createdAt: true, provider: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, { revenue: number; fees: number; count: number; providers: Record<string, number> }> = {};

    for (const p of payments) {
      const key = this.getGroupKey(p.createdAt, groupBy);
      if (!grouped[key]) grouped[key] = { revenue: 0, fees: 0, count: 0, providers: {} };
      grouped[key].revenue += p.amount;
      grouped[key].fees += p.fee || 0;
      grouped[key].count += 1;
      grouped[key].providers[p.provider] = (grouped[key].providers[p.provider] || 0) + p.amount;
    }

    return {
      groupBy,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalFees: payments.reduce((sum, p) => sum + (p.fee || 0), 0),
      totalTransactions: payments.length,
      data: Object.entries(grouped).map(([date, values]) => ({ date, ...values })),
    };
  }

  async getBookingTrends(tenantId: string, startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startTime: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { startTime: true, status: true, totalPrice: true },
      orderBy: { startTime: 'asc' },
    });

    const grouped: Record<string, { total: number; completed: number; cancelled: number; revenue: number }> = {};

    for (const b of bookings) {
      const key = this.getGroupKey(b.startTime, groupBy);
      if (!grouped[key]) grouped[key] = { total: 0, completed: 0, cancelled: 0, revenue: 0 };
      grouped[key].total += 1;
      if (b.status === 'COMPLETED') grouped[key].completed += 1;
      if (b.status === 'CANCELLED') grouped[key].cancelled += 1;
      if (b.status === 'COMPLETED') grouped[key].revenue += b.totalPrice;
    }

    return {
      groupBy,
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === 'COMPLETED').length,
      cancellationRate: bookings.length > 0
        ? (bookings.filter((b) => b.status === 'CANCELLED').length / bookings.length * 100).toFixed(1)
        : '0',
      data: Object.entries(grouped).map(([date, values]) => ({ date, ...values })),
    };
  }

  async getTechnicianPerformance(tenantId: string, startDate: string, endDate: string) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        booking: { tenantId, startTime: { gte: new Date(startDate), lte: new Date(endDate) } },
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        booking: { select: { totalPrice: true, status: true } },
      },
    });

    const techMap: Record<string, {
      technicianId: string;
      technicianName: string;
      email: string;
      totalJobs: number;
      completedJobs: number;
      cancelledJobs: number;
      revenue: number;
    }> = {};

    for (const d of dispatches) {
      const tech = d.assignedTo;
      if (!tech) continue;
      if (!techMap[tech.id]) {
        techMap[tech.id] = {
          technicianId: tech.id,
          technicianName: `${tech.firstName} ${tech.lastName}`,
          email: tech.email,
          totalJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          revenue: 0,
        };
      }
      techMap[tech.id].totalJobs += 1;
      if (d.status === 'COMPLETED') {
        techMap[tech.id].completedJobs += 1;
        techMap[tech.id].revenue += d.booking?.totalPrice || 0;
      }
      if (d.status === 'CANCELLED') techMap[tech.id].cancelledJobs += 1;
    }

    return Object.values(techMap).sort((a, b) => b.completedJobs - a.completedJobs);
  }

  async getTopServices(tenantId: string, startDate: string, endDate: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        startTime: { gte: new Date(startDate), lte: new Date(endDate) },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: { service: { select: { id: true, name: true, price: true } } },
    });

    const svcMap: Record<string, { serviceId: string; name: string; price: number; bookings: number; revenue: number }> = {};

    for (const b of bookings) {
      const svc = b.service;
      if (!svc) continue;
      if (!svcMap[svc.id]) {
        svcMap[svc.id] = { serviceId: svc.id, name: svc.name, price: svc.price, bookings: 0, revenue: 0 };
      }
      svcMap[svc.id].bookings += 1;
      svcMap[svc.id].revenue += b.totalPrice;
    }

    return Object.values(svcMap).sort((a, b) => b.bookings - a.bookings);
  }

  private getGroupKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    if (groupBy === 'day') return d.toISOString().slice(0, 10);
    if (groupBy === 'week') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      return start.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 7);
  }
}
