import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationService } from './notification.service';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
    private notificationService: NotificationService,
  ) {}

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
}
