import { Injectable, Logger } from '@nestjs/common';
import { NigeriaBulkSMSClient } from 'nigeriabulksms-sdk';
import { PrismaService } from '../prisma/prisma.service';

interface BookingSmsDetails {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  address?: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  count?: number;
  price?: number;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private prisma: PrismaService) {}

  private async getClient(): Promise<{ client: NigeriaBulkSMSClient | null; settings: any }> {
    const settings = await this.prisma.platformSmsSettings.findFirst();
    if (!settings || !settings.isActive || !settings.smsApiKey) {
      return { client: null, settings };
    }

    const username = settings.smsApiUsername || '';
    let password = '';
    try {
      if (settings.smsApiKey) {
        const parts = settings.smsApiKey.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const key = (process.env.ENCRYPTION_KEY || 'default-encryption-key-change-me-32ch').slice(0, 32);
        const crypto = require('crypto');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        password = decipher.update(parts[1], 'hex', 'utf8') + decipher.final('utf8');
      }
    } catch {
      this.logger.error('Failed to decrypt SMS API key');
      return { client: null, settings };
    }

    if (settings.smsProvider === 'nigeria_bulk_sms' || settings.smsProvider === 'africas_talking') {
      try {
        const client = new NigeriaBulkSMSClient({ username, password });
        return { client, settings };
      } catch (error) {
        this.logger.error('Failed to initialize NigeriaBulkSMS client', error instanceof Error ? error.message : String(error));
        return { client: null, settings };
      }
    }

    return { client: null, settings };
  }

  async sendSms(to: string, message: string, senderId?: string): Promise<SendSmsResult> {
    const { client, settings } = await this.getClient();

    if (!client) {
      this.logger.log(`[SMS STUB] To: ${to}, Message: ${message}`);
      return { success: true, messageId: `stub_${Date.now()}` };
    }

    const sender = senderId || settings?.smsApiSenderId || 'BookerMap';
    const phone = to.startsWith('+') ? to.replace('+', '') : to.startsWith('0') ? '234' + to.substring(1) : to;

    try {
      const response = await client.sms.send({
        message: message.substring(0, 1600),
        sender: sender.substring(0, 11),
        mobiles: phone,
      });

      this.logger.log(`SMS sent to ${phone}, count: ${response.count}, price: ${response.price}`);
      return {
        success: true,
        messageId: response.data?.[0]?.id?.toString() || `sms_${Date.now()}`,
        count: response.count,
        price: response.price,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${phone}: ${error.message || error}`);
      return { success: false, error: error.message || 'Unknown SMS error' };
    }
  }

  async sendBulkSms(recipients: string[], message: string, senderId?: string): Promise<SendSmsResult> {
    const { client, settings } = await this.getClient();

    if (!client) {
      this.logger.log(`[SMS STUB] Bulk To: ${recipients.join(',')}, Message: ${message}`);
      return { success: true, messageId: `stub_bulk_${Date.now()}`, count: recipients.length };
    }

    const sender = senderId || settings?.smsApiSenderId || 'BookerMap';
    const phones = recipients.map(p => p.startsWith('+') ? p.replace('+', '') : p.startsWith('0') ? '234' + p.substring(1) : p).join(',');

    try {
      const response = await client.sms.send({
        message: message.substring(0, 1600),
        sender: sender.substring(0, 11),
        mobiles: phones,
      });

      this.logger.log(`Bulk SMS sent to ${phones}, count: ${response.count}, price: ${response.price}`);
      return {
        success: true,
        count: response.count,
        price: response.price,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send bulk SMS: ${error.message || error}`);
      return { success: false, error: error.message || 'Unknown SMS error' };
    }
  }

  async sendBookingConfirmation(phone: string, details: BookingSmsDetails): Promise<SendSmsResult> {
    const message = `Booking Confirmed! ${details.serviceName} on ${details.startTime.toLocaleString()}. Ref: ${details.id.slice(-8).toUpperCase()}`;
    return this.sendSms(phone, message);
  }

  async sendBookingReminder(phone: string, details: BookingSmsDetails): Promise<SendSmsResult> {
    const message = `Reminder: ${details.serviceName} is in 24 hours on ${details.startTime.toLocaleString()}.${details.address ? ' Location: ' + details.address : ''}`;
    return this.sendSms(phone, message);
  }

  async sendEnRouteNotification(phone: string, technicianName: string, eta: string): Promise<SendSmsResult> {
    const message = `Your technician ${technicianName} is en route! Estimated arrival: ${eta}.`;
    return this.sendSms(phone, message);
  }

  async getBalance(): Promise<{ balance: number; currency?: string } | null> {
    const { client } = await this.getClient();
    if (!client) return null;

    try {
      const response = await client.data.getBalance();
      return { balance: response.balance, currency: response.currency };
    } catch (error: any) {
      this.logger.error(`Failed to get SMS balance: ${error.message || error}`);
      return null;
    }
  }

  async getDeliveryReports(): Promise<any[]> {
    const { client } = await this.getClient();
    if (!client) return [];

    try {
      const response = await client.data.getReports();
      return response.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to get delivery reports: ${error.message || error}`);
      return [];
    }
  }
}