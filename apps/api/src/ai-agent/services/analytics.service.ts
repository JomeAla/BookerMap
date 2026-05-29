import { Injectable } from '@nestjs/common';
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
}
