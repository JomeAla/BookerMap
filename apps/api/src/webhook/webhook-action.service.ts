import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { SchedulingService } from '../booking/scheduling.service';
import { ChatService } from '../ai-agent/services/chat.service';
import { WebhookAction, WebhookActionResponse } from './webhook-action.types';

@Injectable()
export class WebhookActionService {
  private readonly logger = new Logger(WebhookActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
    private readonly chatService: ChatService,
  ) {}

  async authenticate(slug: string, secret: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const webhook = await this.prisma.webhook.findFirst({
      where: { tenantId: tenant.id, isActive: true },
    });

    if (!webhook || !webhook.secret) {
      throw new UnauthorizedException('No active webhook found for this tenant');
    }

    if (webhook.secret !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return tenant.id;
  }

  async handleAction(tenantId: string, action: WebhookAction, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    this.logger.log(`Handling action ${action} for tenant ${tenantId}`);

    switch (action) {
      case 'trigger_ai':
        return this.handleTriggerAi(tenantId, payload);
      case 'check_availability':
        return this.handleCheckAvailability(tenantId, payload);
      case 'create_booking':
        return this.handleCreateBooking(tenantId, payload);
      case 'get_booking_status':
        return this.handleGetBookingStatus(tenantId, payload);
      case 'get_customer_info':
        return this.handleGetCustomerInfo(tenantId, payload);
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  private async handleTriggerAi(tenantId: string, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    const message = payload.message as string | undefined;
    if (!message) {
      throw new BadRequestException('Payload must include a "message" field');
    }

    const conversationId = payload.conversationId as string | undefined;
    const result = await this.chatService.processMessage(message, tenantId, conversationId);

    return {
      success: true,
      data: {
        reply: result.reply,
        intent: result.intent,
        entities: result.entities,
        conversationId: result.conversationId,
        quickReplies: result.quickReplies,
      },
    };
  }

  private async handleCheckAvailability(tenantId: string, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    const serviceId = payload.serviceId as string | undefined;
    const date = payload.date as string | undefined;

    if (!serviceId || !date) {
      throw new BadRequestException('Payload must include "serviceId" and "date" fields');
    }

    const slots = await this.schedulingService.getAvailableSlots(serviceId, date, tenantId);

    return {
      success: true,
      data: { slots, serviceId, date },
    };
  }

  private async handleCreateBooking(tenantId: string, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    const serviceId = payload.serviceId as string | undefined;
    const startTime = payload.startTime as string | undefined;
    const customerPhone = payload.customerPhone as string | undefined;
    const customerEmail = payload.customerEmail as string | undefined;
    const customerFirstName = payload.customerFirstName as string | undefined;
    const customerLastName = payload.customerLastName as string | undefined;
    const technicianId = payload.technicianId as string | undefined;
    const locationId = payload.locationId as string | undefined;
    const notes = payload.notes as string | undefined;

    if (!serviceId || !startTime) {
      throw new BadRequestException('Payload must include "serviceId" and "startTime" fields');
    }

    let customerId = payload.customerId as string | undefined;

    if (!customerId && (customerPhone || customerEmail)) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          ...(customerPhone ? { phone: customerPhone } : {}),
          ...(customerEmail ? { email: customerEmail } : {}),
        },
      });

      if (!customer && customerFirstName && customerLastName && customerPhone) {
        const created = await this.prisma.customer.create({
          data: {
            tenantId,
            firstName: customerFirstName,
            lastName: customerLastName,
            phone: customerPhone,
            email: customerEmail || null,
          },
        });
        customerId = created.id;
      } else if (customer) {
        customerId = customer.id;
      }
    }

    if (!customerId) {
      throw new BadRequestException('Could not determine customer. Provide customerId, or customerPhone + customerFirstName + customerLastName');
    }

    const dto = {
      serviceId,
      customerId,
      startTime,
      technicianId,
      locationId,
      notes,
      intakeAnswers: payload.intakeAnswers as Record<string, unknown> | undefined,
      selectedModifiers: payload.selectedModifiers as string[] | undefined,
      couponCode: payload.couponCode as string | undefined,
      couponDiscount: payload.couponDiscount as number | undefined,
    };

    const booking = await this.bookingService.create(tenantId, dto as any);

    return {
      success: true,
      data: { booking },
    };
  }

  private async handleGetBookingStatus(tenantId: string, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    const bookingId = payload.bookingId as string | undefined;
    const reference = payload.reference as string | undefined;
    const customerPhone = payload.customerPhone as string | undefined;

    let booking;

    if (bookingId) {
      booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
        include: { service: true, customer: true, technician: true },
      });
    } else if (reference) {
      booking = await this.prisma.booking.findFirst({
        where: { id: { startsWith: reference }, tenantId },
        include: { service: true, customer: true, technician: true },
      });
    } else if (customerPhone) {
      const customer = await this.prisma.customer.findFirst({
        where: { tenantId, phone: customerPhone },
      });
      if (customer) {
        booking = await this.prisma.booking.findFirst({
          where: { tenantId, customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          include: { service: true, customer: true, technician: true },
        });
      }
    }

    if (!booking) {
      return {
        success: false,
        message: 'Booking not found. Provide bookingId, reference, or customerPhone.',
      };
    }

    return {
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        service: booking.service?.name || null,
        customerName: booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : null,
        technicianName: booking.technician ? `${booking.technician.firstName} ${booking.technician.lastName}` : null,
        totalPrice: booking.totalPrice,
      },
    };
  }

  private async handleGetCustomerInfo(tenantId: string, payload: Record<string, unknown>): Promise<WebhookActionResponse> {
    const phone = payload.phone as string | undefined;
    const email = payload.email as string | undefined;

    if (!phone && !email) {
      throw new BadRequestException('Payload must include "phone" or "email" field');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      },
      include: {
        bookings: { take: 5, orderBy: { createdAt: 'desc' }, include: { service: true } },
      },
    });

    if (!customer) {
      return { success: false, message: 'Customer not found' };
    }

    return {
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        recentBookings: customer.bookings.map(b => ({
          id: b.id,
          status: b.status,
          startTime: b.startTime,
          service: b.service.name,
        })),
      },
    };
  }
}
