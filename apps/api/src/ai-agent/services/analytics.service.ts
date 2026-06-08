import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversationStats(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const totalConversations = await this.prisma.aiConversation.count({ where });

    const conversations = await this.prisma.aiConversation.findMany({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    let resolvedCount = 0;
    let totalDurationMs = 0;
    let conversationsWithDuration = 0;

    for (const conv of conversations) {
      if (conv.messages.length >= 4) {
        const lastMessage = conv.messages[conv.messages.length - 1];
        const lastIntent = lastMessage.intent;
        if (lastIntent === 'BOOKING_CONFIRM' || lastIntent === 'BOOKING_CANCELLED' || lastIntent === 'BOOKING_RESCHEDULED') {
          resolvedCount++;
        }
      }

      if (conv.messages.length >= 2) {
        const firstMsg = conv.messages[0];
        const lastMsg = conv.messages[conv.messages.length - 1];
        totalDurationMs += lastMsg.createdAt.getTime() - firstMsg.createdAt.getTime();
        conversationsWithDuration++;
      }
    }

    const resolutionRate = totalConversations > 0 ? (resolvedCount / totalConversations) * 100 : 0;
    const avgDuration = conversationsWithDuration > 0 ? totalDurationMs / conversationsWithDuration : 0;

    return {
      totalConversations,
      resolvedCount,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      avgDurationMs: Math.round(avgDuration),
      avgDurationMinutes: Math.round(avgDuration / 60000 * 100) / 100,
    };
  }

  async getCommonQueries(tenantId: string) {
    const messages = await this.prisma.aiMessage.findMany({
      where: {
        role: 'assistant',
        intent: { not: null },
        conversation: { tenantId },
      },
    });

    const intentCounts: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.intent) {
        intentCounts[msg.intent] = (intentCounts[msg.intent] || 0) + 1;
      }
    }

    const sorted = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([intent, count]) => ({ intent, count }));

    const total = sorted.reduce((sum, item) => sum + item.count, 0);

    return {
      totalQueries: total,
      topIntents: sorted.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100 * 100) / 100 : 0,
      })),
    };
  }

  async getFailedConversations(tenantId: string) {
    const conversations = await this.prisma.aiConversation.findMany({
      where: { tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const failed = conversations.filter(conv => {
      if (conv.messages.length < 2) return true;
      const lastMsg = conv.messages[conv.messages.length - 1];
      if (lastMsg.role === 'user') return true;
      return lastMsg.intent === 'FALLBACK';
    });

    return failed.map(conv => ({
      id: conv.id,
      sessionId: conv.sessionId,
      status: conv.status,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content : '',
      createdAt: conv.createdAt,
    }));
  }

  async rateMessage(messageId: string, tenantId: string, userId: string, rating: number, feedback?: string) {
    const message = await this.prisma.aiMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { tenantId: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.conversation.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot rate messages from another tenant');
    }
    if (message.role !== 'assistant') {
      throw new ForbiddenException('Only assistant messages can be rated');
    }

    return this.prisma.aiMessage.update({
      where: { id: messageId },
      data: {
        rating,
        feedback: feedback ?? null,
        ratedBy: userId,
        ratedAt: new Date(),
      },
      select: {
        id: true,
        rating: true,
        feedback: true,
        ratedBy: true,
        ratedAt: true,
      },
    });
  }

  async getFeedbackStats(tenantId: string) {
    const rated = await this.prisma.aiMessage.findMany({
      where: {
        role: 'assistant',
        rating: { not: null },
        conversation: { tenantId },
      },
      select: { rating: true },
    });

    const totalRated = rated.length;
    if (totalRated === 0) {
      return {
        totalRated: 0,
        avgRating: 0,
        percentPositive: 0,
        percentNegative: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    let sum = 0;
    let positive = 0;
    let negative = 0;
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const msg of rated) {
      const r = msg.rating!;
      sum += r;
      if (r >= 4) positive += 1;
      if (r <= 2) negative += 1;
      if (breakdown[r] !== undefined) breakdown[r] += 1;
    }

    return {
      totalRated,
      avgRating: Math.round((sum / totalRated) * 100) / 100,
      percentPositive: Math.round((positive / totalRated) * 10000) / 100,
      percentNegative: Math.round((negative / totalRated) * 10000) / 100,
      ratingBreakdown: breakdown,
    };
  }

  async getRecentRatedMessages(tenantId: string, limit: number = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await this.prisma.aiMessage.findMany({
      where: {
        role: 'assistant',
        rating: { not: null },
        conversation: { tenantId },
      },
      orderBy: { ratedAt: 'desc' },
      take: safeLimit,
      include: {
        conversation: {
          select: {
            id: true,
            sessionId: true,
            createdAt: true,
          },
        },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      contentSnippet: m.content.length > 160 ? `${m.content.slice(0, 160)}...` : m.content,
      intent: m.intent,
      rating: m.rating,
      feedback: m.feedback,
      ratedBy: m.ratedBy,
      ratedAt: m.ratedAt,
      createdAt: m.createdAt,
      conversationId: m.conversationId,
      sessionId: m.conversation.sessionId,
    }));
  }
}
