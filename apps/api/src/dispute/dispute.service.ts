import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {}

  async createDispute(tenantId: string, dto: {
    customerId: string;
    type: string;
    description: string;
    amount: number;
    bookingId?: string;
    invoiceId?: string;
  }) {
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, tenantId },
      });
      if (!booking) throw new NotFoundException('Booking not found');
    }

    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        type: dto.type as any,
        description: dto.description,
        amount: dto.amount,
        bookingId: dto.bookingId || null,
        invoiceId: dto.invoiceId || null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        booking: { include: { service: true } },
        invoice: true,
      },
    });

    this.webhookService.dispatchEvent(tenantId, 'dispute.created', { disputeId: dispute.id, type: dispute.type })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    const admins = await this.prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'OWNER', 'MANAGER'] } },
      select: { id: true },
    });
    for (const admin of admins) {
      this.notificationService.sendInApp(tenantId, admin.id, 'New Dispute', `A ${dto.type} dispute has been filed`).catch(() => {});
    }

    return dispute;
  }

  async addEvidence(disputeId: string, tenantId: string, file: { fileName: string; fileType: string; fileData: string }, description: string, uploadedById: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: { id: disputeId, tenantId },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const evidence = await this.prisma.disputeEvidence.create({
      data: {
        disputeId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileData: file.fileData,
        description: description || null,
        uploadedById,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.notificationService.sendInApp(tenantId, dispute.customerId, 'Evidence Added', `New evidence added to dispute #${disputeId.slice(0, 8)}`).catch(() => {});

    return evidence;
  }

  async getEvidence(disputeId: string) {
    return this.prisma.disputeEvidence.findMany({
      where: { disputeId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: { id, tenantId },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: { status: status as any },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        booking: { include: { service: true } },
        invoice: true,
      },
    });

    this.webhookService.dispatchEvent(tenantId, 'dispute.updated', { disputeId: id, status })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    this.notificationService.sendInApp(tenantId, dispute.customerId, 'Dispute Updated', `Your dispute status has changed to ${status}`).catch(() => {});

    return updated;
  }

  async resolveDispute(id: string, tenantId: string, resolution: string, note: string | undefined, resolvedById: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: { id, tenantId },
      include: { invoice: { include: { payments: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      throw new BadRequestException('Dispute is already resolved or closed');
    }

    if ((resolution === 'REFUND_FULL' || resolution === 'REFUND_PARTIAL') && dispute.invoice?.payments?.length) {
      for (const payment of dispute.invoice.payments) {
        if (payment.status === 'SUCCESS') {
          const refundAmount = resolution === 'REFUND_FULL' ? payment.amount : dispute.amount;
          try {
            await this.paymentService.refundPayment(payment.id, refundAmount, tenantId);
          } catch (err) {
            this.logger.error(`Refund failed for payment ${payment.id}`, err);
          }
        }
      }
    }

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution: resolution as any,
        resolutionNote: note || null,
        resolvedById,
        resolvedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        booking: { include: { service: true } },
        invoice: true,
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.webhookService.dispatchEvent(tenantId, 'dispute.resolved', { disputeId: id, resolution })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    this.notificationService.sendInApp(tenantId, dispute.customerId, 'Dispute Resolved', `Your dispute has been resolved: ${resolution}`).catch(() => {});

    return updated;
  }

  async getDisputes(tenantId: string, filters?: {
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    return this.prisma.dispute.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        booking: { include: { service: true } },
        invoice: true,
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerDisputes(customerId: string, tenantId: string) {
    return this.prisma.dispute.findMany({
      where: { customerId, tenantId },
      include: {
        booking: { include: { service: true } },
        invoice: true,
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDisputeById(id: string, tenantId: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        booking: { include: { service: true, customer: true } },
        invoice: { include: { lineItems: true, payments: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        evidence: {
          include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async getDisputeStats(tenantId: string) {
    const disputes = await this.prisma.dispute.findMany({
      where: { tenantId },
    });

    const statusCounts = { OPEN: 0, INVESTIGATING: 0, RESOLVED: 0, CLOSED: 0 };
    let totalDisputedAmount = 0;
    let resolvedTimes: number[] = [];

    for (const d of disputes) {
      statusCounts[d.status as keyof typeof statusCounts]++;
      totalDisputedAmount += d.amount;
      if (d.resolvedAt && d.createdAt) {
        resolvedTimes.push(d.resolvedAt.getTime() - d.createdAt.getTime());
      }
    }

    const avgResolutionTimeMs = resolvedTimes.length > 0
      ? resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length
      : 0;

    return {
      total: disputes.length,
      statusCounts,
      totalDisputedAmount,
      avgResolutionTimeHours: Math.round(avgResolutionTimeMs / (1000 * 60 * 60) * 10) / 10,
      openCount: statusCounts.OPEN + statusCounts.INVESTIGATING,
    };
  }
}
