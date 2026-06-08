import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookDeliveryService } from './webhook-delivery.service';
import * as crypto from 'crypto';

export const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.updated',
  'booking.cancelled',
  'booking.rescheduled',
  'customer.created',
  'customer.updated',
  'invoice.created',
  'invoice.paid',
  'invoice.overdue',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'review.created',
  'review.updated',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private deliveryService: WebhookDeliveryService,
  ) {}

  async registerWebhook(tenantId: string, dto: CreateWebhookDto) {
    return this.prisma.webhook.create({
      data: {
        tenantId,
        url: dto.url,
        events: dto.events,
        secret: dto.secret || this.generateSecret(),
      },
    });
  }

  async updateWebhook(id: string, data: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.events !== undefined) updateData.events = data.events;
    if (data.secret !== undefined) updateData.secret = data.secret;
    if (data.isActive !== undefined) updateData.isActive = data.isActive === 'true';

    return this.prisma.webhook.update({ where: { id }, data: updateData });
  }

  async deleteWebhook(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return this.prisma.webhook.delete({ where: { id } });
  }

  async getWebhooks(tenantId: string) {
    return this.prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebhookById(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return webhook;
  }

  async dispatchEvent(tenantId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`No webhooks subscribed to event: ${event}`);
      return;
    }

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    for (const webhook of webhooks) {
      const delivery = await this.deliveryService.createDelivery(webhook.id, tenantId, event, payload);
      this.dispatchToWebhook(webhook, event, body, delivery.id);
    }
  }

  private async dispatchToWebhook(
    webhook: { id: string; url: string; secret: string | null },
    event: string,
    body: string,
    deliveryId: string,
  ): Promise<void> {
    const signature = this.generateSignature(body, webhook.secret || '');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'User-Agent': 'BookerMap-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        this.logger.log(`Webhook ${webhook.id} dispatched to ${webhook.url} (${response.status})`);
        await this.deliveryService.markSuccess(deliveryId, response.status);
      } else {
        this.logger.warn(`Webhook ${webhook.id} returned ${response.status} from ${webhook.url}`);
        await this.deliveryService.markFailed(deliveryId, `HTTP ${response.status}`, response.status);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook ${webhook.id} failed for ${webhook.url}: ${msg}`);
      await this.deliveryService.markFailed(deliveryId, msg);
    }
  }

  generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
