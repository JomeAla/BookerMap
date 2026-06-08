import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  bookingConfirmation,
  bookingReminder,
  invoiceEmail,
  invoiceReminder,
  paymentReceipt,
  passwordReset,
  welcomeEmail,
  teamInvite,
  feedbackRequest,
  campaignEmail,
  disputeOpened,
  disputeResolved,
  renderTemplate,
  renderHandlebars,
  TemplateName,
  TemplateData,
  BookingConfirmationData,
  BookingReminderData,
  InvoiceEmailData,
  InvoiceReminderData,
  PaymentReceiptData,
  PasswordResetData,
  WelcomeEmailData,
  TeamInviteData,
  FeedbackRequestData,
  CampaignEmailData,
  DisputeOpenedData,
  DisputeResolvedData,
} from './email-templates';

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
          from: this.configService.get<string>('SMTP_FROM') || 'BookerMap <noreply@bookermap.com>',
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

  async sendTemplate(to: string, name: TemplateName, data: TemplateData, subjectOverride?: string): Promise<void> {
    const rendered = renderTemplate(name, data);
    const subject = subjectOverride || rendered.subject;
    await this.sendMail({ to, subject, text: rendered.text, html: rendered.html });
  }

  renderHandlebars(template: string, data: Record<string, unknown>): string {
    return renderHandlebars(template, data);
  }

  async sendBookingConfirmation(customerEmail: string, details: BookingDetails): Promise<void> {
    const data: BookingConfirmationData = {
      customerName: details.customerName,
      serviceName: details.serviceName,
      startTime: details.startTime,
      endTime: details.endTime,
      technicianName: details.technicianName,
      address: details.address,
      totalPrice: details.totalPrice,
      bookingId: details.id,
    };
    const tpl = bookingConfirmation(data);
    await this.sendMail({
      to: customerEmail,
      subject: `Booking Confirmed - ${details.serviceName}`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendBookingReminder(customerEmail: string, details: BookingDetails): Promise<void> {
    const data: BookingReminderData = {
      customerName: details.customerName,
      serviceName: details.serviceName,
      startTime: details.startTime,
      endTime: details.endTime,
      technicianName: details.technicianName,
      address: details.address,
      totalPrice: details.totalPrice,
      bookingId: details.id,
      hoursAway: 24,
    };
    const tpl = bookingReminder(data);
    await this.sendMail({
      to: customerEmail,
      subject: `Reminder: ${details.serviceName} in 24 hours`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendInvoiceEmail(customerEmail: string, details: InvoiceDetails): Promise<void> {
    const data: InvoiceEmailData = {
      invoiceNumber: details.invoiceNumber,
      customerName: details.customerName,
      amount: details.amount,
      dueDate: details.dueDate,
      paymentLink: details.paymentLink,
      items: details.items,
    };
    const tpl = invoiceEmail(data);
    await this.sendMail({
      to: customerEmail,
      subject: `Invoice ${details.invoiceNumber} - $${details.amount.toFixed(2)}`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendInvoiceReminder(
    customerEmail: string,
    details: { invoiceNumber: string; customerName: string; amount: number; dueDate: Date; invoiceId: string; daysOverdue?: number },
  ): Promise<void> {
    const data: InvoiceReminderData = {
      invoiceNumber: details.invoiceNumber,
      customerName: details.customerName,
      amount: details.amount,
      dueDate: details.dueDate,
      invoiceId: details.invoiceId,
      daysOverdue: details.daysOverdue,
    };
    const tpl = invoiceReminder(data);
    const subject = details.daysOverdue && details.daysOverdue > 0
      ? `Overdue: Invoice ${details.invoiceNumber}`
      : `Reminder: Invoice ${details.invoiceNumber} is due`;
    await this.sendMail({ to: customerEmail, subject, text: tpl.text, html: tpl.html });
  }

  async sendPaymentReceipt(customerEmail: string, details: PaymentReceiptData): Promise<void> {
    const tpl = paymentReceipt(details);
    await this.sendMail({
      to: customerEmail,
      subject: `Payment Received - ${details.reference}`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendPasswordReset(customerEmail: string, details: PasswordResetData): Promise<void> {
    const tpl = passwordReset(details);
    await this.sendMail({
      to: customerEmail,
      subject: 'Reset your BookerMap password',
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendWelcomeEmail(customerEmail: string, details: WelcomeEmailData): Promise<void> {
    const tpl = welcomeEmail(details);
    await this.sendMail({
      to: customerEmail,
      subject: 'Welcome to BookerMap!',
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendTeamInvite(inviteeEmail: string, details: TeamInviteData): Promise<void> {
    const tpl = teamInvite(details);
    await this.sendMail({
      to: inviteeEmail,
      subject: `${details.inviterName} invited you to ${details.companyName}`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendFeedbackRequest(
    customerEmail: string,
    details: { customerName: string; serviceName: string; bookingId: string; technicianName?: string; surveyUrl?: string },
  ): Promise<void> {
    const data: FeedbackRequestData = {
      customerName: details.customerName,
      serviceName: details.serviceName,
      bookingId: details.bookingId,
      technicianName: details.technicianName,
      surveyUrl: details.surveyUrl,
    };
    const tpl = feedbackRequest(data);
    await this.sendMail({
      to: customerEmail,
      subject: `How was your ${details.serviceName} experience?`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendCampaignEmail(recipientEmail: string, details: CampaignEmailData): Promise<void> {
    const tpl = campaignEmail(details);
    await this.sendMail({
      to: recipientEmail,
      subject: details.subject,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendDisputeOpened(customerEmail: string, details: DisputeOpenedData): Promise<void> {
    const tpl = disputeOpened(details);
    await this.sendMail({
      to: customerEmail,
      subject: `Dispute opened: ${details.disputeId}`,
      text: tpl.text,
      html: tpl.html,
    });
  }

  async sendDisputeResolved(customerEmail: string, details: DisputeResolvedData): Promise<void> {
    const tpl = disputeResolved(details);
    await this.sendMail({
      to: customerEmail,
      subject: `Dispute ${details.disputeId} resolved`,
      text: tpl.text,
      html: tpl.html,
    });
  }
}
