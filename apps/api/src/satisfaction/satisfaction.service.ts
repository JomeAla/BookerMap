import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SatisfactionService {
  private readonly logger = new Logger(SatisfactionService.name);

  constructor(private prisma: PrismaService) {}

  async recordSurvey(tenantId: string, dto: {
    bookingId?: string;
    customerId: string;
    touchpoint: string;
    score: number;
    scoreType?: string;
    feedback?: string;
    category?: string;
  }) {
    return this.prisma.satisfactionSurvey.create({
      data: {
        tenantId,
        bookingId: dto.bookingId || null,
        customerId: dto.customerId,
        touchpoint: dto.touchpoint,
        score: dto.score,
        scoreType: dto.scoreType || 'CSAT',
        feedback: dto.feedback || null,
        category: dto.category || null,
      },
      include: {
        booking: { include: { service: true } },
        customer: true,
      },
    });
  }

  async recordNPS(tenantId: string, customerId: string, score: number, reason?: string) {
    const promoterType = score >= 9 ? 'PROMOTER' : score >= 7 ? 'PASSIVE' : 'DETRACTOR';

    return this.prisma.nPSResponse.create({
      data: {
        tenantId,
        customerId,
        score,
        promoterType,
        reason: reason || null,
      },
      include: { customer: true },
    });
  }

  async getCSATScore(tenantId: string, dateRange?: { startDate?: string; endDate?: string }) {
    const where: any = { tenantId, scoreType: 'CSAT' };
    if (dateRange?.startDate || dateRange?.endDate) {
      where.respondedAt = {};
      if (dateRange.startDate) where.respondedAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) where.respondedAt.lte = new Date(dateRange.endDate);
    }

    const surveys = await this.prisma.satisfactionSurvey.findMany({ where, select: { score: true } });
    const total = surveys.reduce((sum, s) => sum + s.score, 0);
    const count = surveys.length;

    return {
      average: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      count,
      total,
    };
  }

  async getNPSScore(tenantId: string, dateRange?: { startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) where.createdAt.lte = new Date(dateRange.endDate);
    }

    const responses = await this.prisma.nPSResponse.findMany({ where, select: { promoterType: true } });
    const total = responses.length;
    if (total === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };

    const promoters = responses.filter(r => r.promoterType === 'PROMOTER').length;
    const detractors = responses.filter(r => r.promoterType === 'DETRACTOR').length;
    const nps = Math.round(((promoters / total) - (detractors / total)) * 100);

    return { nps, promoters, passives: responses.filter(r => r.promoterType === 'PASSIVE').length, detractors, total };
  }

  async getSatisfactionTrend(tenantId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where: {
        tenantId,
        respondedAt: { gte: startDate },
      },
      select: { score: true, respondedAt: true, scoreType: true },
      orderBy: { respondedAt: 'asc' },
    });

    const monthlyMap = new Map<string, { scores: number[]; count: number }>();
    surveys.forEach(s => {
      const key = s.respondedAt.toISOString().slice(0, 7);
      if (!monthlyMap.has(key)) monthlyMap.set(key, { scores: [], count: 0 });
      const entry = monthlyMap.get(key)!;
      entry.scores.push(s.score);
      entry.count++;
    });

    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      averageScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
        : 0,
      responses: data.count,
    }));
  }

  async getFeedbackByCategory(tenantId: string) {
    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where: {
        tenantId,
        category: { not: null },
        feedback: { not: null },
      },
      select: { category: true, score: true, feedback: true, respondedAt: true },
      orderBy: { respondedAt: 'desc' },
    });

    const grouped = new Map<string, { scores: number[]; feedbacks: string[]; count: number }>();
    surveys.forEach(s => {
      const cat = s.category || 'other';
      if (!grouped.has(cat)) grouped.set(cat, { scores: [], feedbacks: [], count: 0 });
      const entry = grouped.get(cat)!;
      entry.scores.push(s.score);
      if (s.feedback) entry.feedbacks.push(s.feedback);
      entry.count++;
    });

    return Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      averageScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
        : 0,
      feedbackCount: data.feedbacks.length,
      totalResponses: data.count,
      feedbacks: data.feedbacks.slice(0, 10),
    }));
  }

  async getCustomerSatisfaction(customerId: string, tenantId: string) {
    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where: { customerId, tenantId },
      include: {
        booking: { include: { service: true } },
      },
      orderBy: { respondedAt: 'desc' },
    });

    const npsResponses = await this.prisma.nPSResponse.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return { surveys, npsResponses };
  }

  async findAll(tenantId: string, filters?: { touchpoint?: string; startDate?: string; endDate?: string }) {
    const where: any = { tenantId };
    if (filters?.touchpoint) where.touchpoint = filters.touchpoint;
    if (filters?.startDate || filters?.endDate) {
      where.respondedAt = {};
      if (filters.startDate) where.respondedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.respondedAt.lte = new Date(filters.endDate);
    }

    return this.prisma.satisfactionSurvey.findMany({
      where,
      include: {
        customer: true,
        booking: { include: { service: true } },
      },
      orderBy: { respondedAt: 'desc' },
    });
  }
}
