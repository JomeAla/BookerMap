import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { EscalationStatus, EscalationPriority, UserRole } from '@prisma/client';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async escalate(
    conversationId: string,
    tenantId: string,
    customerId?: string,
    reason?: string,
    priority: EscalationPriority = EscalationPriority.NORMAL,
  ) {
    const existing = await this.prisma.escalation.findUnique({
      where: { conversationId },
    });
    if (existing) {
      throw new BadRequestException('This conversation is already escalated');
    }

    const escalation = await this.prisma.escalation.create({
      data: {
        tenantId,
        conversationId,
        customerId: customerId || null,
        reason: reason || null,
        priority,
        status: EscalationStatus.OPEN,
      },
    });

    await this.notifyAgents(tenantId, escalation);

    return escalation;
  }

  async assign(id: string, agentUserId: string) {
    const escalation = await this.prisma.escalation.findUnique({ where: { id } });
    if (!escalation) {
      throw new NotFoundException('Escalation not found');
    }
    if (escalation.status === EscalationStatus.RESOLVED || escalation.status === EscalationStatus.CLOSED) {
      throw new BadRequestException('Cannot assign a resolved or closed escalation');
    }

    return this.prisma.escalation.update({
      where: { id },
      data: {
        assignedToId: agentUserId,
        status: EscalationStatus.ASSIGNED,
      },
    });
  }

  async resolve(id: string, resolution?: string) {
    const escalation = await this.prisma.escalation.findUnique({ where: { id } });
    if (!escalation) {
      throw new NotFoundException('Escalation not found');
    }

    return this.prisma.escalation.update({
      where: { id },
      data: {
        status: EscalationStatus.RESOLVED,
        resolvedAt: new Date(),
        resolution: resolution || null,
      },
    });
  }

  async getOpenEscalations(
    tenantId: string,
    status?: EscalationStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: any = { tenantId };
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.escalation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.escalation.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyEscalations(agentUserId: string, tenantId: string) {
    return this.prisma.escalation.findMany({
      where: {
        assignedToId: agentUserId,
        tenantId,
        status: { in: [EscalationStatus.OPEN, EscalationStatus.ASSIGNED] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getConversationHistory(conversationId: string) {
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEscalationWithConversation(id: string) {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!escalation) {
      throw new NotFoundException('Escalation not found');
    }

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId: escalation.conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return { ...escalation, messages };
  }

  async getOpenCount(tenantId: string): Promise<number> {
    return this.prisma.escalation.count({
      where: {
        tenantId,
        status: { in: [EscalationStatus.OPEN, EscalationStatus.ASSIGNED] },
      },
    });
  }

  private async notifyAgents(tenantId: string, escalation: any) {
    try {
      const agents = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
          isActive: true,
        },
        select: { id: true },
      });

      const severity = escalation.priority === EscalationPriority.URGENT || escalation.priority === EscalationPriority.HIGH
        ? '🚨 '
        : '';

      for (const agent of agents) {
        await this.notificationService.sendInApp(
          tenantId,
          agent.id,
          `${severity}New Escalation`,
          `A customer has requested to speak with a human agent. Reason: ${escalation.reason || 'No reason provided'}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to notify agents about escalation', error);
    }
  }
}
