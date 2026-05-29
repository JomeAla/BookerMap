import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../booking/scheduling.service';

@Injectable()
export class RecurringBookingService {
  private readonly logger = new Logger(RecurringBookingService.name);

  constructor(
    private prisma: PrismaService,
    private schedulingService: SchedulingService,
  ) {}

  async create(tenantId: string, dto: any) {
    const { serviceId, customerId, technicianId, startDate, endDate, frequency, interval, dayOfWeek, dayOfMonth, discount, notes, intakeAnswers, selectedModifiers } = dto;

    const service = await this.prisma.service.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) throw new NotFoundException('Service not found');

    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const recurring = await this.prisma.recurringBooking.create({
      data: {
        tenantId,
        frequency: frequency || 'WEEKLY',
        interval: interval || 1,
        dayOfWeek: dayOfWeek ?? new Date(startDate).getDay(),
        dayOfMonth: dayOfMonth ?? new Date(startDate).getDate(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        discount: discount || 0,
        isActive: true,
      },
    });

    await this.generateBookings(tenantId, recurring.id, dto);

    return recurring;
  }

  async findAll(tenantId: string) {
    return this.prisma.recurringBooking.findMany({
      where: { tenantId },
      include: {
        bookings: { include: { customer: true, service: true, technician: true }, take: 5, orderBy: { startTime: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const recurring = await this.prisma.recurringBooking.findFirst({
      where: { id, tenantId },
      include: {
        bookings: { include: { customer: true, service: true, technician: true }, orderBy: { startTime: 'desc' } },
      },
    });
    if (!recurring) throw new NotFoundException('Recurring booking not found');
    return recurring;
  }

  async toggleActive(tenantId: string, id: string) {
    const recurring = await this.prisma.recurringBooking.findFirst({ where: { id, tenantId } });
    if (!recurring) throw new NotFoundException('Recurring booking not found');
    return this.prisma.recurringBooking.update({
      where: { id },
      data: { isActive: !recurring.isActive },
    });
  }

  async delete(tenantId: string, id: string) {
    const recurring = await this.prisma.recurringBooking.findFirst({ where: { id, tenantId } });
    if (!recurring) throw new NotFoundException('Recurring booking not found');
    await this.prisma.recurringBooking.delete({ where: { id } });
    return { success: true };
  }

  private async generateBookings(tenantId: string, recurrenceId: string, dto: any) {
    const recurring = await this.prisma.recurringBooking.findUnique({ where: { id: recurrenceId } });
    if (!recurring) return;

    const { serviceId, customerId, technicianId, notes, intakeAnswers, selectedModifiers } = dto;
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) return;

    const dates = this.computeDates(recurring);
    let totalPrice = service.price;

    if (selectedModifiers?.length) {
      const modifiers = await this.prisma.serviceModifier.findMany({ where: { id: { in: selectedModifiers }, serviceId } });
      totalPrice += modifiers.reduce((sum, m) => sum + m.price, 0);
    }

    if (recurring.discount > 0) {
      totalPrice = totalPrice * (1 - recurring.discount / 100);
    }

    for (const date of dates) {
      const startTime = date;
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      if (technicianId) {
        const hasConflict = await this.schedulingService.checkConflicts(technicianId, startTime, endTime);
        if (hasConflict) continue;
      }

      try {
        await this.prisma.booking.create({
          data: {
            tenantId,
            serviceId,
            customerId,
            technicianId: technicianId || null,
            startTime,
            endTime,
            notes,
            intakeAnswers: intakeAnswers || undefined,
            totalPrice,
            status: 'PENDING',
            recurrenceId,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to create recurring booking for ${date.toISOString()}: ${err}`);
      }
    }
  }

  private computeDates(recurring: any): Date[] {
    const dates: Date[] = [];
    const start = new Date(recurring.startDate);
    const end = recurring.endDate ? new Date(recurring.endDate) : new Date(start.getTime() + 90 * 86400000);
    const current = new Date(start);

    if (recurring.frequency === 'DAILY') {
      while (current <= end) { dates.push(new Date(current)); current.setDate(current.getDate() + recurring.interval); }
    } else if (recurring.frequency === 'WEEKLY') {
      while (current <= end) {
        if (current.getDay() === (recurring.dayOfWeek ?? start.getDay())) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (recurring.frequency === 'MONTHLY') {
      while (current <= end) {
        if (current.getDate() === (recurring.dayOfMonth ?? start.getDate())) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }
}
