import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityMap, ConversationState } from '../dto/chat-message.dto';

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  missingFields?: string[];
}

@Injectable()
export class TaskExecutor {
  constructor(private readonly prisma: PrismaService) {}

  async executeTask(
    intent: string,
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    switch (intent) {
      case 'BOOKING_CREATE':
        return this.handleBookingCreate(entities, context, tenantId);
      case 'BOOKING_CANCEL':
        return this.handleBookingCancel(entities, context, tenantId);
      case 'BOOKING_RESCHEDULE':
        return this.handleBookingReschedule(entities, context, tenantId);
      case 'BOOKING_STATUS':
        return this.handleBookingStatus(entities, context, tenantId);
      case 'PAYMENT_INQUIRY':
        return this.handlePaymentInquiry(entities, context, tenantId);
      case 'PRICE_INQUIRY':
        return this.handlePriceInquiry(entities, context, tenantId);
      default:
        return { success: false, message: 'I am not sure how to handle that request.' };
    }
  }

  private async handleBookingCreate(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.service) missing.push('service');
    if (!entities.date) missing.push('date');
    if (!entities.time) missing.push('time');
    if (!entities.name) missing.push('name');
    if (!entities.phone) missing.push('phone');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    if (entities.date && entities.time) {
      const hoursCheck = await this.isWithinBusinessHours(entities.date, entities.time, tenantId);
      if (!hoursCheck.ok) {
        return { success: false, message: hoursCheck.message! };
      }
    }

    try {
      const service = await this.prisma.service.findFirst({
        where: { tenantId, name: { contains: entities.service, mode: 'insensitive' }, isActive: true },
      });

      if (!service) {
        return { success: false, message: `I couldn't find a service called "${entities.service}". Please check the name and try again.` };
      }

      let customer = await this.prisma.customer.findFirst({
        where: { tenantId, phone: entities.phone },
      });

      if (!customer) {
        const names = (entities.name || 'Customer').split(' ');
        customer = await this.prisma.customer.create({
          data: {
            tenantId,
            firstName: names[0] || 'Unknown',
            lastName: names.slice(1).join(' ') || 'Customer',
            phone: entities.phone || '',
            email: entities.email,
          },
        });
      }

      const startTime = new Date(`${entities.date || ''}T${entities.time || ''}:00`);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      const booking = await this.prisma.booking.create({
        data: {
          tenantId,
          customerId: customer.id,
          serviceId: service.id,
          startTime,
          endTime,
          totalPrice: service.price,
          status: 'PENDING',
        },
      });

      return {
        success: true,
        message: '',
        data: {
          bookingId: booking.id,
          service: service.name,
          date: entities.date,
          time: entities.time,
          price: service.price,
        },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error creating your booking. Please try again.' };
    }
  }

  private async handleBookingCancel(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.bookingId && !entities.phone) missing.push('bookingId');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    try {
      const where: any = { tenantId, status: { not: 'CANCELLED' } };
      if (entities.bookingId) {
        where.id = entities.bookingId;
      } else if (entities.phone) {
        const customer = await this.prisma.customer.findFirst({ where: { tenantId, phone: entities.phone } });
        if (!customer) {
          return { success: false, message: "I couldn't find a customer with that phone number." };
        }
        where.customerId = customer.id;
      }

      const booking = await this.prisma.booking.findFirst({ where, include: { service: true } });
      if (!booking) {
        return { success: false, message: "I couldn't find any active booking matching that information." };
      }

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });

      return {
        success: true,
        message: '',
        data: { bookingId: booking.id, service: booking.service.name },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error cancelling your booking. Please try again.' };
    }
  }

  private async handleBookingReschedule(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.bookingId && !entities.phone) missing.push('bookingId');
    if (!entities.date && !entities.time) missing.push('date');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    try {
      const where: any = { tenantId, status: { notIn: ['CANCELLED', 'COMPLETED'] } };
      if (entities.bookingId) {
        where.id = entities.bookingId;
      } else if (entities.phone) {
        const customer = await this.prisma.customer.findFirst({ where: { tenantId, phone: entities.phone } });
        if (!customer) {
          return { success: false, message: "I couldn't find a customer with that phone number." };
        }
        where.customerId = customer.id;
      }

      const booking = await this.prisma.booking.findFirst({ where, include: { service: true } });
      if (!booking) {
        return { success: false, message: "I couldn't find an active booking matching that information." };
      }

      const startTime = entities.date
        ? entities.time
          ? new Date(`${entities.date}T${entities.time}:00`)
          : new Date(`${entities.date}T${new Date(booking.startTime).toTimeString().slice(0, 5)}:00`)
        : null;

      if (startTime) {
        const duration = entities.date && !entities.time ? booking.service.duration : booking.service.duration;
        const endTime = new Date(startTime.getTime() + (duration || 60) * 60000);

        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            startTime,
            endTime,
            status: 'PENDING',
          },
        });
      }

      return {
        success: true,
        message: '',
        data: {
          bookingId: booking.id,
          service: booking.service.name,
          date: entities.date || this.formatDate(booking.startTime),
          time: entities.time || this.formatTime(booking.startTime),
        },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error rescheduling your booking. Please try again.' };
    }
  }

  private async handleBookingStatus(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.phone && !entities.email && !entities.bookingId) missing.push('phone');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    try {
      const where: any = { tenantId };
      if (entities.bookingId) {
        where.id = entities.bookingId;
      } else {
        const customerWhere: any = { tenantId };
        if (entities.phone) customerWhere.phone = entities.phone;
        if (entities.email) customerWhere.email = entities.email;

        const customer = await this.prisma.customer.findFirst({ where: customerWhere });
        if (!customer) {
          return { success: false, message: "I couldn't find a customer matching that information." };
        }
        where.customerId = customer.id;
      }

      const booking = await this.prisma.booking.findFirst({
        where,
        include: { service: true, customer: true },
        orderBy: { startTime: 'desc' },
      });

      if (!booking) {
        return { success: false, message: "I couldn't find any bookings matching that information." };
      }

      return {
        success: true,
        message: '',
        data: {
          bookingId: booking.id,
          service: booking.service.name,
          date: this.formatDate(booking.startTime),
          time: this.formatTime(booking.startTime),
          status: this.formatStatus(booking.status),
          customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
        },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error looking up your booking. Please try again.' };
    }
  }

  private async handlePaymentInquiry(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.phone && !entities.email) missing.push('phone');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    try {
      const customerWhere: any = { tenantId };
      if (entities.phone) customerWhere.phone = entities.phone;
      if (entities.email) customerWhere.email = entities.email;

      const customer = await this.prisma.customer.findFirst({ where: customerWhere });
      if (!customer) {
        return { success: false, message: "I couldn't find a customer matching that information." };
      }

      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          customerId: customer.id,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (invoices.length === 0) {
        return { success: true, message: '', data: { noInvoices: true } };
      }

      const paymentSettings = await this.prisma.paymentSettings.findFirst({
        where: { tenantId, isActive: true },
      });

      const invoiceList = invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.total,
        status: inv.status,
        dueDate: this.formatDate(inv.dueDate),
      }));

      return {
        success: true,
        message: '',
        data: {
          invoices: invoiceList,
          customerName: `${customer.firstName} ${customer.lastName}`,
        },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error checking your invoices. Please try again.' };
    }
  }

  private async handlePriceInquiry(
    entities: EntityMap,
    context: ConversationState,
    tenantId: string,
  ): Promise<ExecutionResult> {
    const missing: string[] = [];
    if (!entities.service) missing.push('service');

    if (missing.length > 0) {
      return { success: false, message: '', missingFields: missing };
    }

    try {
      const service = await this.prisma.service.findFirst({
        where: { tenantId, name: { contains: entities.service, mode: 'insensitive' }, isActive: true },
      });

      if (!service) {
        return {
          success: false,
          message: '',
          data: { serviceNotFound: true, serviceName: entities.service },
        };
      }

      return {
        success: true,
        message: '',
        data: {
          service: service.name,
          price: service.price,
          currency: 'NGN',
          duration: service.duration,
        },
      };
    } catch (error) {
      return { success: false, message: 'Sorry, there was an error looking up the price. Please try again.' };
    }
  }

  private async isWithinBusinessHours(date: string, time: string, tenantId: string): Promise<{ ok: boolean; message?: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { aiSettings: true } });
    const aiSettings = tenant?.aiSettings as Record<string, any> || {};
    const businessHours = aiSettings.businessHours as Record<string, { open: string; close: string } | null> || {};

    if (!businessHours || Object.keys(businessHours).length === 0) {
      return { ok: true };
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dateObj = new Date(date + 'T12:00:00');
    const dayName = dayNames[dateObj.getDay()];
    const hours = businessHours[dayName];

    if (!hours) {
      const message = this.formatBusinessHoursMessage(businessHours);
      return { ok: false, message };
    }

    const requestedMinutes = this.timeToMinutes(time);
    const openMinutes = this.timeToMinutes(hours.open);
    const closeMinutes = this.timeToMinutes(hours.close);

    if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
      const message = this.formatBusinessHoursMessage(businessHours);
      return { ok: false, message };
    }

    return { ok: true };
  }

  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  private formatBusinessHoursMessage(businessHours: Record<string, { open: string; close: string } | null>): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const lines: string[] = [];

    for (const day of days) {
      const h = businessHours[day];
      if (h) {
        const dayCap = day.charAt(0).toUpperCase() + day.slice(1);
        lines.push(`${dayCap}: ${h.open} - ${h.close}`);
      }
    }

    if (lines.length === 0) {
      return "I'm sorry, we're currently closed. Please try again during business hours.";
    }

    return `I'm sorry, we're currently closed. Our business hours are:\n${lines.join('\n')}\n\nPlease try again during business hours.`;
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  private formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toTimeString().slice(0, 5);
  }

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No Show',
    };
    return map[status] || status;
  }
}
