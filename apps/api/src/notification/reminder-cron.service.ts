import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
    private whatsAppService: WhatsAppService,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 6 * * *')
  async checkSubscriptionExpirations() {
    this.logger.log('Running subscription expiration check...');

    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lt: now },
        plan: { not: 'FREE' },
      },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Found ${expired.length} expired subscriptions`);

    for (const sub of expired) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });

      await this.notificationService.createNotification(
        sub.tenantId,
        'IN_APP' as any,
        'IN_APP',
        sub.tenantId,
        'Subscription Expired',
        `Your ${sub.plan} subscription has expired. Please renew to continue using all features.`,
      );

      this.logger.log(`Expired subscription ${sub.id} for tenant ${sub.tenant.name}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders() {
    this.logger.log('Running booking reminder cron...');

    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: in23Hours, lte: in25Hours },
      },
      include: {
        customer: true,
        service: true,
        technician: true,
        tenant: true,
      },
    });

    this.logger.log(`Found ${bookings.length} bookings needing reminders`);

    for (const booking of bookings) {
      try {
        const reminderKey = `reminder:booking:${booking.id}`;

        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            tenantId: booking.tenantId,
            status: { in: ['SENT', 'PENDING'] },
            body: { contains: reminderKey },
          },
        });

        if (alreadySent) {
          this.logger.debug(`Reminder already sent for booking ${booking.id}`);
          continue;
        }

        const customer = booking.customer;
        const customerName = `${customer.firstName} ${customer.lastName}`;

        if (customer.email) {
          await this.emailService.sendBookingReminder(customer.email, {
            id: booking.id,
            customerName,
            serviceName: booking.service.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            technicianName: booking.technician
              ? `${booking.technician.firstName} ${booking.technician.lastName}`
              : undefined,
            totalPrice: booking.totalPrice,
          });
        }

        if (customer.phone) {
          await this.smsService.sendBookingReminder(customer.phone, {
            id: booking.id,
            customerName,
            serviceName: booking.service.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
          });
        }

        if (customer.phone) {
          try {
            await this.whatsAppService.sendTemplate(
              customer.phone,
              'booking_reminder',
              {
                customer_name: customerName,
                service_name: booking.service.name,
                start_time: booking.startTime.toLocaleString(),
                booking_id: booking.id.slice(-8).toUpperCase(),
              },
            );
          } catch (waError) {
            this.logger.warn(
              `WhatsApp reminder failed for booking ${booking.id}: ${waError instanceof Error ? waError.message : waError}`,
            );
          }
        }

        await this.notificationService.createNotification(
          booking.tenantId,
          'EMAIL' as any,
          'EMAIL',
          customer.email || customer.phone || 'unknown',
          `Reminder: ${booking.service.name} in 24 hours`,
          reminderKey,
        );

        this.logger.log(`Reminder sent for booking ${booking.id} (${customerName})`);
      } catch (error) {
        this.logger.error(
          `Failed to send reminder for booking ${booking.id}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    this.logger.log('Booking reminder cron completed');
  }

  @Cron('0 8 * * *')
  async sendPaymentReminders() {
    this.logger.log('Running payment reminder cron...');

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lte: now },
      },
      include: {
        customer: true,
        tenant: true,
      },
    });

    this.logger.log(`Found ${invoices.length} unpaid invoices needing reminders`);

    for (const invoice of invoices) {
      try {
        const reminderKey = `reminder:invoice:${invoice.id}`;

        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            tenantId: invoice.tenantId,
            status: { in: ['SENT', 'PENDING'] },
            body: { contains: reminderKey },
            createdAt: { gte: twentyFourHoursAgo },
          },
        });

        if (alreadySent) {
          this.logger.debug(`Payment reminder already sent for invoice ${invoice.id}`);
          continue;
        }

        const customer = invoice.customer;
        const customerName = `${customer.firstName} ${customer.lastName}`;

        if (customer.email) {
          await this.emailService.sendInvoiceReminder(customer.email, {
            invoiceNumber: invoice.invoiceNumber,
            customerName,
            amount: invoice.total,
            dueDate: invoice.dueDate,
            invoiceId: invoice.id,
          });
        }

        await this.notificationService.createNotification(
          invoice.tenantId,
          'EMAIL' as any,
          'EMAIL',
          customer.email || 'unknown',
          `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
          reminderKey,
        );

        this.logger.log(`Payment reminder sent for invoice ${invoice.id} (${customerName})`);
      } catch (error) {
        this.logger.error(
          `Failed to send payment reminder for invoice ${invoice.id}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    this.logger.log('Payment reminder cron completed');
  }
}
