import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private prisma: PrismaService) {}

  async createDelivery(webhookId: string, tenantId: string, event: string, payload: Record<string, unknown>) {
    return this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        tenantId,
        event,
        payload: payload as any,
        status: 'PENDING',
        attempts: 0,
      },
    });
  }

  async markSuccess(id: string, responseStatus?: number) {
    return this.prisma.webhookDelivery.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        responseStatus: responseStatus ?? null,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string, responseStatus?: number) {
    const delivery = await this.prisma.webhookDelivery.findUnique({ where: { id } });
    if (!delivery) return;

    const attempts = delivery.attempts + 1;
    const isTerminal = attempts >= MAX_ATTEMPTS;
    const nextRetryAt = isTerminal
      ? null
      : new Date(Date.now() + Math.pow(2, attempts) * 60 * 1000);

    return this.prisma.webhookDelivery.update({
      where: { id },
      data: {
        status: isTerminal ? 'FAILED' : 'RETRYING',
        attempts,
        errorMessage,
        responseStatus: responseStatus ?? delivery.responseStatus,
        lastAttemptAt: new Date(),
        nextRetryAt,
      },
    });
  }

  async retryFailedDeliveries() {
    const pending = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'RETRYING',
        nextRetryAt: { lte: new Date() },
      },
      include: { webhook: true },
    });

    if (pending.length === 0) {
      this.logger.debug('No deliveries to retry');
      return { retried: 0 };
    }

    let retried = 0;
    for (const delivery of pending) {
      try {
        const body = JSON.stringify({
          event: delivery.event,
          timestamp: new Date().toISOString(),
          data: delivery.payload,
        });

        const crypto = await import('crypto');
        const signature = crypto
          .createHmac('sha256', delivery.webhook.secret || '')
          .update(body)
          .digest('hex');

        const response = await fetch(delivery.webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': delivery.event,
            'User-Agent': 'BookerMap-Webhook/1.0',
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          await this.markSuccess(delivery.id, response.status);
        } else {
          await this.markFailed(delivery.id, `HTTP ${response.status}`, response.status);
        }
        retried++;
      } catch (error) {
        await this.markFailed(
          delivery.id,
          error instanceof Error ? error.message : String(error),
        );
        retried++;
      }
    }

    this.logger.log(`Retried ${retried} deliveries`);
    return { retried };
  }

  async getDeliveries(
    tenantId: string,
    filters?: { event?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;
    const where: any = { tenantId };
    if (filters?.event) where.event = filters.event;
    if (filters?.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getWebhookDeliveries(webhookId: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
