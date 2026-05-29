import { Injectable, Logger } from '@nestjs/common';

interface BookingSmsDetails {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  address?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any;

  constructor() {
    this.client = null;
  }

  async sendSms(to: string, message: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.send({ to, message });
        this.logger.log(`SMS sent to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${to}`, error instanceof Error ? error.message : error);
      }
    } else {
      this.logger.log(`[SMS STUB] To: ${to}, Message: ${message}`);
    }
  }

  async sendBookingConfirmation(phone: string, details: BookingSmsDetails): Promise<void> {
    const message = `Booking Confirmed! ${details.serviceName} on ${details.startTime.toLocaleString()}. Ref: ${details.id.slice(-8).toUpperCase()}`;
    await this.sendSms(phone, message);
  }

  async sendBookingReminder(phone: string, details: BookingSmsDetails): Promise<void> {
    const message = `Reminder: ${details.serviceName} is in 24 hours on ${details.startTime.toLocaleString()}. ${details.address ? 'Location: ' + details.address : ''}`;
    await this.sendSms(phone, message);
  }

  async sendEnRouteNotification(phone: string, technicianName: string, eta: string): Promise<void> {
    const message = `Your technician ${technicianName} is en route! Estimated arrival: ${eta}.`;
    await this.sendSms(phone, message);
  }
}
