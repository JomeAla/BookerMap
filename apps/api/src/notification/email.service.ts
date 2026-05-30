import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface BookingDetails {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  technicianName?: string;
  address?: string;
  totalPrice?: number;
}

interface InvoiceDetails {
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  paymentLink?: string;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      try {
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({
          host,
          port: parseInt(port || '587', 10),
          secure: port === '465',
          auth: { user, pass },
        });
        this.logger.log('SMTP transporter initialized');
      } catch {
        this.logger.warn('nodemailer not available, SMTP disabled');
        this.transporter = null;
      }
    } else {
      this.logger.warn('SMTP not configured, emails will be logged to console');
      this.transporter = null;
    }
  }

  async sendMail(options: MailOptions): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get<string>('SMTP_FROM') || 'noreply@bookermap.com',
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${options.to}`, error instanceof Error ? error.message : error);
      }
    } else {
      this.logger.log(`[EMAIL STUB] To: ${options.to}, Subject: ${options.subject}, Body: ${options.text}`);
    }
  }

  async sendBookingConfirmation(customerEmail: string, details: BookingDetails): Promise<void> {
    const subject = `Booking Confirmed - ${details.serviceName}`;
    const text = `Hi ${details.customerName},\n\nYour booking has been confirmed!\n\nService: ${details.serviceName}\nDate: ${details.startTime.toLocaleString()}\nPrice: $${details.totalPrice}\n\nThank you for choosing our service.`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#3B82F6;color:#fff;padding:20px;text-align:center}.content{padding:20px}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>Booking Confirmed!</h2></div><div class="content"><p>Hi <strong>${details.customerName}</strong>,</p><p>Your booking has been confirmed.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;font-weight:bold">Service:</td><td style="padding:8px">${details.serviceName}</td></tr><tr><td style="padding:8px;font-weight:bold">Date:</td><td style="padding:8px">${details.startTime.toLocaleString()}</td></tr><tr><td style="padding:8px;font-weight:bold">Price:</td><td style="padding:8px">$${details.totalPrice}</td></tr></table></div><div class="footer"><p>Thank you for choosing our service!</p></div></body></html>`;
    await this.sendMail({ to: customerEmail, subject, text, html });
  }

  async sendBookingReminder(customerEmail: string, details: BookingDetails): Promise<void> {
    const subject = `Reminder: ${details.serviceName} in 24 hours`;
    const text = `Hi ${details.customerName},\n\nThis is a reminder that your appointment is in 24 hours.\n\nService: ${details.serviceName}\nDate: ${details.startTime.toLocaleString()}\nAddress: ${details.address || 'N/A'}\n\nPlease be available at the scheduled time.`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#F59E0B;color:#fff;padding:20px;text-align:center}.content{padding:20px}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>Appointment Reminder</h2></div><div class="content"><p>Hi <strong>${details.customerName}</strong>,</p><p>Your appointment is in <strong>24 hours</strong>.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;font-weight:bold">Service:</td><td style="padding:8px">${details.serviceName}</td></tr><tr><td style="padding:8px;font-weight:bold">Date:</td><td style="padding:8px">${details.startTime.toLocaleString()}</td></tr><tr><td style="padding:8px;font-weight:bold">Address:</td><td style="padding:8px">${details.address || 'N/A'}</td></tr></table></div><div class="footer"><p>Please be available at the scheduled time.</p></div></body></html>`;
    await this.sendMail({ to: customerEmail, subject, text, html });
  }

  async sendInvoiceEmail(customerEmail: string, details: InvoiceDetails): Promise<void> {
    const subject = `Invoice ${details.invoiceNumber} - $${details.amount.toFixed(2)}`;
    const itemsHtml = (details.items || []).map(
      (item) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${item.unitPrice.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${item.total.toFixed(2)}</td></tr>`
    ).join('');
    const text = `Hi ${details.customerName},\n\nInvoice ${details.invoiceNumber} for $${details.amount.toFixed(2)} is due by ${details.dueDate.toLocaleDateString()}.\n\nPayment link: ${details.paymentLink || 'N/A'}\n\nPlease pay before the due date.`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#10B981;color:#fff;padding:20px;text-align:center}.content{padding:20px}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>Invoice ${details.invoiceNumber}</h2></div><div class="content"><p>Hi <strong>${details.customerName}</strong>,</p><p>Your invoice is ready.</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">Description</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Unit Price</th><th style="padding:8px;text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><p style="font-size:18px;font-weight:bold;text-align:right;margin-top:16px">Total: $${details.amount.toFixed(2)}</p><p style="text-align:right">Due: ${details.dueDate.toLocaleDateString()}</p><div style="text-align:center;margin-top:24px"><a href="${details.paymentLink || '#'}" style="background:#3B82F6;color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block">Pay Now</a></div></div><div class="footer"><p>Please pay before the due date.</p></div></body></html>`;
    await this.sendMail({ to: customerEmail, subject, text, html });
  }

  async sendInvoiceReminder(customerEmail: string, details: { invoiceNumber: string; customerName: string; amount: number; dueDate: Date; invoiceId: string }): Promise<void> {
    const subject = `Reminder: Invoice ${details.invoiceNumber} is due`;
    const text = `Hi ${details.customerName},\n\nThis is a reminder that Invoice ${details.invoiceNumber} for $${details.amount.toFixed(2)} was due on ${details.dueDate.toLocaleDateString()}.\n\nPlease make your payment as soon as possible to avoid any late fees.\n\nThank you for your business.`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#EF4444;color:#fff;padding:20px;text-align:center}.content{padding:20px}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>Payment Reminder</h2></div><div class="content"><p>Hi <strong>${details.customerName}</strong>,</p><p>This is a reminder that Invoice <strong>${details.invoiceNumber}</strong> for <strong>$${details.amount.toFixed(2)}</strong> was due on <strong>${details.dueDate.toLocaleDateString()}</strong>.</p><p>Please make your payment as soon as possible to avoid any late fees.</p></div><div class="footer"><p>Thank you for your business!</p></div></body></html>`;
    await this.sendMail({ to: customerEmail, subject, text, html });
  }

  async sendFeedbackRequest(customerEmail: string, details: { customerName: string; serviceName: string; bookingId: string }): Promise<void> {
    const subject = `How was your ${details.serviceName} experience?`;
    const text = `Hi ${details.customerName},\n\nWe'd love to hear about your recent ${details.serviceName} experience. Please take a moment to leave a review.\n\nThank you!`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.header{background:#8B5CF6;color:#fff;padding:20px;text-align:center}.content{padding:20px;text-align:center}.footer{padding:20px;font-size:12px;color:#666;text-align:center;border-top:1px solid #eee}</style></head><body><div class="header"><h2>We Value Your Feedback!</h2></div><div class="content"><p>Hi <strong>${details.customerName}</strong>,</p><p>How was your <strong>${details.serviceName}</strong> experience?</p><p>Your feedback helps us improve.</p></div><div class="footer"><p>Thank you for choosing our service!</p></div></body></html>`;
    await this.sendMail({ to: customerEmail, subject, text, html });
  }
}
