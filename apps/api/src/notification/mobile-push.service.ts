import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface MobilePushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface MobilePushResult {
  success: boolean;
  failureCount: number;
}

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);
  private app: any = null;
  private configured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length === 0) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        }
        this.app = admin;
        this.configured = true;
        this.logger.log('Firebase Admin SDK configured for mobile push');
      } catch (err: any) {
        this.logger.warn('Firebase Admin SDK not configured: ' + (err instanceof Error ? err.message : err));
        this.app = null;
      }
    } else {
      this.logger.warn('Firebase credentials not found; mobile push notifications disabled');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendToToken(token: string, payload: MobilePushPayload): Promise<MobilePushResult> {
    if (!this.configured || !this.app) {
      this.logger.log(`[MOBILE PUSH STUB] Token: ${token.substring(0, 10)}..., Title: ${payload.title}, Body: ${payload.body}`);
      return { success: false, failureCount: 1 };
    }

    try {
      const messaging = this.app.messaging();
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          notification: {
            clickAction: payload.data?.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });
      this.logger.debug(`Mobile push sent to token ${token.substring(0, 10)}...`);
      return { success: true, failureCount: 0 };
    } catch (error: any) {
      this.logger.error(`Failed to send mobile push to token: ${error instanceof Error ? error.message : error}`);
      if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-registration-token') {
        await this.prisma.mobileDevice.updateMany({
          where: { token },
          data: { isActive: false },
        }).catch(() => {});
        this.logger.warn(`Deactivated invalid device token ${token.substring(0, 10)}...`);
      }
      return { success: false, failureCount: 1 };
    }
  }

  async sendToTokens(tokens: string[], payload: MobilePushPayload): Promise<MobilePushResult> {
    if (!this.configured || !this.app) {
      this.logger.log(`[MOBILE PUSH STUB] Tokens: ${tokens.length}, Title: ${payload.title}`);
      return { success: false, failureCount: tokens.length };
    }

    if (tokens.length === 0) {
      return { success: true, failureCount: 0 };
    }

    try {
      const messaging = this.app.messaging();
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          notification: {
            clickAction: payload.data?.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            if (resp.error?.code === 'messaging/registration-token-not-registered' || resp.error?.code === 'messaging/invalid-registration-token') {
              this.prisma.mobileDevice.updateMany({
                where: { token: tokens[idx] },
                data: { isActive: false },
              }).catch(() => {});
            }
          }
        });
        this.logger.warn(`Mobile push multicast: ${response.successCount} sent, ${response.failureCount} failed`);
        await this.deactivateTokens(failedTokens);
      }

      return { success: response.failureCount < tokens.length, failureCount: response.failureCount };
    } catch (error: any) {
      this.logger.error(`Failed to send multicast mobile push: ${error instanceof Error ? error.message : error}`);
      return { success: false, failureCount: tokens.length };
    }
  }

  async sendToTopic(topic: string, payload: MobilePushPayload): Promise<MobilePushResult> {
    if (!this.configured || !this.app) {
      this.logger.log(`[MOBILE PUSH STUB] Topic: ${topic}, Title: ${payload.title}`);
      return { success: false, failureCount: 1 };
    }

    try {
      const messaging = this.app.messaging();
      await messaging.send({
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          notification: {
            clickAction: payload.data?.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });
      this.logger.debug(`Mobile push sent to topic ${topic}`);
      return { success: true, failureCount: 0 };
    } catch (error: any) {
      this.logger.error(`Failed to send mobile push to topic ${topic}: ${error instanceof Error ? error.message : error}`);
      return { success: false, failureCount: 1 };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<MobilePushResult> {
    if (!this.configured || !this.app) {
      this.logger.log(`[MOBILE PUSH STUB] Subscribe ${tokens.length} tokens to topic: ${topic}`);
      return { success: false, failureCount: tokens.length };
    }

    try {
      const messaging = this.app.messaging();
      const response = await messaging.subscribeToTopic(tokens, topic);
      if (response.failureCount > 0) {
        this.logger.warn(`Subscribe to topic ${topic}: ${response.successCount} succeeded, ${response.failureCount} failed`);
      }
      return { success: response.failureCount < tokens.length, failureCount: response.failureCount };
    } catch (error: any) {
      this.logger.error(`Failed to subscribe tokens to topic ${topic}: ${error instanceof Error ? error.message : error}`);
      return { success: false, failureCount: tokens.length };
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<MobilePushResult> {
    if (!this.configured || !this.app) {
      this.logger.log(`[MOBILE PUSH STUB] Unsubscribe ${tokens.length} tokens from topic: ${topic}`);
      return { success: false, failureCount: tokens.length };
    }

    try {
      const messaging = this.app.messaging();
      const response = await messaging.unsubscribeFromTopic(tokens, topic);
      if (response.failureCount > 0) {
        this.logger.warn(`Unsubscribe from topic ${topic}: ${response.successCount} succeeded, ${response.failureCount} failed`);
      }
      return { success: response.failureCount < tokens.length, failureCount: response.failureCount };
    } catch (error: any) {
      this.logger.error(`Failed to unsubscribe tokens from topic ${topic}: ${error instanceof Error ? error.message : error}`);
      return { success: false, failureCount: tokens.length };
    }
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await this.prisma.mobileDevice.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return devices.map((d) => d.token);
  }

  async getAllActiveDeviceTokens(tenantId: string): Promise<string[]> {
    const devices = await this.prisma.mobileDevice.findMany({
      where: { user: { tenantId }, isActive: true },
      select: { token: true },
    });
    return devices.map((d) => d.token);
  }

  async registerDevice(userId: string, token: string, platform: string, deviceId?: string, appVersion?: string) {
    const existing = await this.prisma.mobileDevice.findUnique({
      where: { token },
    });

    if (existing) {
      if (existing.userId !== userId) {
        return this.prisma.mobileDevice.update({
          where: { token },
          data: { userId, platform, deviceId: deviceId || existing.deviceId, appVersion: appVersion || existing.appVersion, isActive: true },
        });
      }
      return this.prisma.mobileDevice.update({
        where: { token },
        data: { platform, deviceId: deviceId || existing.deviceId, appVersion: appVersion || existing.appVersion, isActive: true, updatedAt: new Date() },
      });
    }

    return this.prisma.mobileDevice.create({
      data: { userId, token, platform, deviceId, appVersion },
    });
  }

  async unregisterDevice(token: string, userId: string) {
    const existing = await this.prisma.mobileDevice.findUnique({
      where: { token },
    });

    if (!existing || existing.userId !== userId) {
      return { deleted: false };
    }

    await this.prisma.mobileDevice.delete({
      where: { token },
    });
    return { deleted: true };
  }

  async getUserDevices(userId: string) {
    return this.prisma.mobileDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async deactivateTokens(tokens: string[]) {
    if (tokens.length === 0) return;
    try {
      await this.prisma.mobileDevice.updateMany({
        where: { token: { in: tokens } },
        data: { isActive: false },
      });
    } catch {
      this.logger.error('Failed to deactivate invalid tokens');
    }
  }
}