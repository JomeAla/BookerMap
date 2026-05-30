import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { SchedulingService } from './scheduling.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private schedulingService: SchedulingService,
    private webhookService: WebhookService,
  ) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const { serviceId, customerId, startTime, technicianId, locationId, notes, intakeAnswers, selectedModifiers, couponCode, couponDiscount } = dto;

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
      include: { modifiers: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.duration * 60000);

    if (technicianId) {
      const hasConflict = await this.schedulingService.checkConflicts(technicianId, start, end);
      if (hasConflict) throw new BadRequestException('Time slot conflicts with an existing booking');
    }

    let totalPrice = service.price;
    if (selectedModifiers?.length) {
      const selected = service.modifiers.filter(m => selectedModifiers.includes(m.id));
      totalPrice += selected.reduce((sum, m) => sum + m.price, 0);
    }

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { tenantId_code: { tenantId, code: couponCode.toUpperCase() } },
      });
      if (!coupon) throw new BadRequestException('Invalid coupon code');
      if (!coupon.isActive) throw new BadRequestException('Coupon is no longer active');
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new BadRequestException('Coupon has expired');
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');
      if (coupon.minAmount && totalPrice < coupon.minAmount) throw new BadRequestException(`Minimum amount of ${coupon.minAmount} required`);

      const discount = couponDiscount ?? (coupon.type === 'percentage'
        ? totalPrice * (coupon.value / 100)
        : coupon.value);
      totalPrice = Math.max(0, totalPrice - Math.min(discount, totalPrice));

      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        serviceId,
        customerId,
        technicianId: technicianId || null,
        locationId: locationId || null,
        startTime: start,
        endTime: end,
        notes,
        intakeAnswers: intakeAnswers || undefined,
        totalPrice,
        status: 'PENDING',
      },
      include: { service: true, customer: true, technician: true, location: true },
    });

    this.webhookService.dispatchEvent(tenantId, 'booking.created', { bookingId: booking.id, status: booking.status })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    return booking;
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      technicianId?: string;
    },
  ) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.technicianId) where.technicianId = filters.technicianId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.startTime = {};
      if (filters.dateFrom) where.startTime.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startTime.lte = new Date(filters.dateTo);
    }
    return this.prisma.booking.findMany({
      where,
      include: { service: true, customer: true, technician: true, location: true, dispatch: true, recurrence: true },
      orderBy: { startTime: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        service: { include: { modifiers: true } },
        customer: true,
        technician: true,
        location: true,
        dispatch: true,
        invoices: { include: { lineItems: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async cancel(tenantId: string, id: string) {
    const booking = await this.findById(tenantId, id);
    if (booking.status === 'CANCELLED') throw new BadRequestException('Booking is already cancelled');
    if (booking.status === 'COMPLETED') throw new BadRequestException('Cannot cancel a completed booking');
    const cancelled = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { service: true, customer: true, technician: true },
    });
    this.webhookService.dispatchEvent(tenantId, 'booking.cancelled', { bookingId: id })
      .catch(err => this.logger.error('Webhook dispatch failed', err));
    return cancelled;
  }

  async reschedule(tenantId: string, id: string, dto: RescheduleBookingDto) {
    const booking = await this.findById(tenantId, id);
    if (booking.status === 'CANCELLED') throw new BadRequestException('Cannot reschedule a cancelled booking');
    if (booking.status === 'COMPLETED') throw new BadRequestException('Cannot reschedule a completed booking');

    const newStart = new Date(dto.newStartTime);
    const newEnd = new Date(newStart.getTime() + booking.service.duration * 60000);

    if (booking.technicianId) {
      const hasConflict = await this.schedulingService.checkConflicts(booking.technicianId, newStart, newEnd);
      if (hasConflict) throw new BadRequestException('New time slot conflicts with an existing booking');
    }

    const rescheduled = await this.prisma.booking.update({
      where: { id },
      data: { startTime: newStart, endTime: newEnd, status: 'PENDING' },
      include: { service: true, customer: true, technician: true },
    });
    this.webhookService.dispatchEvent(tenantId, 'booking.rescheduled', { bookingId: id, newStartTime: dto.newStartTime })
      .catch(err => this.logger.error('Webhook dispatch failed', err));
    return rescheduled;
  }
}
