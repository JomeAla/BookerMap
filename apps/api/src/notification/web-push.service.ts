import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private webPush: any;
  private configured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:support@bookermap.com';

    if (publicKey && privateKey) {
      try {
        this.webPush = require('web-push');
        this.webPush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
        this.logger.log('Web Push configured with VAPID keys');
      } catch {
        this.logger.warn('web-push package not installed; push notifications disabled');
        this.webPush = null;
      }
    } else {
      this.logger.warn('VAPID keys not configured; push notifications disabled');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  generateVapidKeys(): { publicKey: string; privateKey: string } {
    if (!this.webPush) {
      try {
        this.webPush = require('web-push');
      } catch {
        throw new Error('web-push package not available');
      }
    }
    return this.webPush.generateVAPIDKeys();
  }

  async subscribe(userId: string, subscription: PushSubscriptionPayload) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      if (existing.userId !== userId) {
        return this.prisma.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            userId,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        });
      }
      return existing;
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!existing || existing.userId !== userId) {
      return { deleted: false };
    }

    await this.prisma.pushSubscription.delete({
      where: { endpoint },
    });
    return { deleted: true };
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscriptionPayload[]> {
    const records = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    return records.map((r) => ({
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
    }));
  }

  async sendNotification(subscription: PushSubscriptionPayload, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.configured || !this.webPush) {
      this.logger.log(`[PUSH STUB] To: ${subscription.endpoint}, Title: ${payload.title}, Body: ${payload.body}`);
      return false;
    }

    try {
      await this.webPush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.pushSubscription.delete({
          where: { endpoint: subscription.endpoint },
        }).catch(() => {});
        this.logger.warn(`Removed expired subscription ${subscription.endpoint}`);
      } else {
        this.logger.error(`Failed to send push notification`, error instanceof Error ? error.message : error);
      }
      return false;
    }
  }

  async send(userId: string, payload: PushNotificationPayload): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.getUserSubscriptions(userId);
    if (subscriptions.length === 0) {
      this.logger.log(`No push subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      const ok = await this.sendNotification(sub, payload);
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed };
  }

  async sendBatch(subscriptions: PushSubscriptionPayload[], payload: PushNotificationPayload): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      const ok = await this.sendNotification(sub, payload);
      if (ok) sent++;
      else failed++;
    }
    return { sent, failed };
  }
}
