import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { BookingGateway } from '../gateway/booking.gateway';
import { WebPushService } from './web-push.service';
import { MobilePushService } from './mobile-push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private bookingGateway: BookingGateway,
    private webPushService: WebPushService,
    private mobilePushService: MobilePushService,
  ) {}

   async sendEmail(tenantId: string, recipient: string, subject: string, body: string, html?: string) {
     const notification = await this.createNotification(tenantId, NotificationType.EMAIL, 'EMAIL', recipient, subject, body);
     
     // Notify via WebSocket
     this.bookingGateway.notifyNewNotification(tenantId, {
       notificationId: notification.id,
       type: notification.type,
       channel: notification.channel,
       recipient: notification.recipient,
       subject: notification.subject,
       body: notification.body,
       status: notification.status,
       createdAt: notification.createdAt,
     });
     
     return notification;
   }

  async sendSms(tenantId: string, recipient: string, message: string) {
    return this.createNotification(tenantId, NotificationType.SMS, 'SMS', recipient, null, message);
  }

  async sendPush(tenantId: string, userId: string, title: string, body: string) {
    const notification = await this.createNotification(tenantId, NotificationType.PUSH, 'PUSH', userId, title, body);
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { userId },
    });

    const webResult = await this.webPushService.send(userId, { title, body });

    const deviceTokens = await this.mobilePushService.getUserDeviceTokens(userId);
    let mobileResult = { success: false, failureCount: 0 };
    if (deviceTokens.length > 0) {
      mobileResult = await this.mobilePushService.sendToTokens(deviceTokens, { title, body });
    }

    if (webResult.sent > 0 || mobileResult.success) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date(), status: 'SENT' },
      });
    }

    return { notification, webResult, mobileResult };
  }

  async sendInApp(tenantId: string, userId: string, title: string, body: string) {
    const notification = await this.createNotification(tenantId, NotificationType.IN_APP, 'IN_APP', userId, title, body);
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { userId },
    });
    return notification;
  }

  async createNotification(
    tenantId: string,
    type: NotificationType,
    channel: string,
    recipient: string,
    subject: string | null,
    body: string,
  ) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        type,
        channel,
        recipient,
        subject,
        body,
        status: 'PENDING',
      },
    });
  }

  async markAsRead(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAsSent(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { sentAt: new Date(), status: 'SENT' },
    });
  }

  async getUserNotifications(userId: string, tenantId: string, filters?: NotificationFilterDto) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      userId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendTeamNotification(tenantId: string, userIds: string[], title: string, body: string) {
    for (const userId of userIds) {
      await this.sendInApp(tenantId, userId, title, body);
    }
    return { sent: userIds.length };
  }

  async getUnreadCount(userId: string, tenantId: string) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        userId,
        readAt: null,
      },
    });
    return { count };
  }

  async updateDeliveryStatus(
    notificationId: string,
    status: string,
    providerMessageId?: string | null,
    failureReason?: string | null,
  ) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found for delivery status update`);
      return null;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: status === 'delivered' ? 'SENT' : status === 'failed' ? 'FAILED' : status.toUpperCase(),
        ...(providerMessageId ? { recipient: notification.recipient } : {}),
      },
    });
  }
}
