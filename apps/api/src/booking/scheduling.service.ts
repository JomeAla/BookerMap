import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(serviceId: string, date: string, tenantId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new NotFoundException('Service not found');

    const technicians = await this.prisma.user.findMany({
      where: { tenantId, role: 'TECHNICIAN', isActive: true },
    });

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availabilityDefault: Array<{ start: string; end: string }> = [{ start: '08:00', end: '17:00' }];

    const slotDuration = service.duration * 60 * 1000;
    const intervalMs = 30 * 60 * 1000;
    const bufferMs = 30 * 60 * 1000;

    const slots: Array<{
      technicianId: string;
      technicianName: string;
      startTime: Date;
      endTime: Date;
    }> = [];

    for (const tech of technicians) {
      const techAvail: Record<string, Array<{ start: string; end: string }>> | null = (tech as any).availability;
      const dayBlocks = techAvail?.[dayOfWeek] || availabilityDefault;

      for (const block of dayBlocks) {
        const [startH, startM] = block.start.split(':').map(Number);
        const [endH, endM] = block.end.split(':').map(Number);

        const blockStart = new Date(date);
        blockStart.setHours(startH, startM, 0, 0);
        const blockEnd = new Date(date);
        blockEnd.setHours(endH, endM, 0, 0);

        const bookings = await this.prisma.booking.findMany({
          where: {
            technicianId: tech.id,
            startTime: { gte: blockStart },
            endTime: { lte: new Date(blockEnd.getTime() + 86400000) },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
          },
          orderBy: { startTime: 'asc' },
        });

        let currentTime = new Date(blockStart);

        while (currentTime.getTime() + slotDuration <= blockEnd.getTime()) {
          const slotEnd = new Date(currentTime.getTime() + slotDuration);
          const isAvailable = !bookings.some(b => {
            const bStart = new Date(b.startTime).getTime() - bufferMs;
            const bEnd = new Date(b.endTime).getTime() + bufferMs;
            return currentTime.getTime() < bEnd && slotEnd.getTime() > bStart;
          });

          if (isAvailable) {
            slots.push({
              technicianId: tech.id,
              technicianName: `${tech.firstName} ${tech.lastName}`,
              startTime: new Date(currentTime),
              endTime: slotEnd,
            });
          }

          currentTime = new Date(currentTime.getTime() + intervalMs);
        }
      }
    }

    return slots;
  }

  async checkConflicts(technicianId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const bufferMs = 30 * 60 * 1000;
    const conflicting = await this.prisma.booking.findFirst({
      where: {
        technicianId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        startTime: { lt: new Date(endTime.getTime() + bufferMs) },
        endTime: { gt: new Date(startTime.getTime() - bufferMs) },
      },
    });
    return !!conflicting;
  }

  async checkSlotAvailability(
    bookingId: string,
    tenantId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<{ available: boolean; conflicts: Array<{ bookingId: string; customerName: string; serviceName: string; startTime: Date; endTime: Date }> }> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const conflicts: Array<{ bookingId: string; customerName: string; serviceName: string; startTime: Date; endTime: Date }> = [];

    if (booking.technicianId) {
      const bufferMs = 30 * 60 * 1000;
      const conflicting = await this.prisma.booking.findMany({
        where: {
          technicianId: booking.technicianId,
          id: { not: bookingId },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { lt: new Date(newEnd.getTime() + bufferMs) },
          endTime: { gt: new Date(newStart.getTime() - bufferMs) },
        },
        include: { customer: true, service: true },
      });

      for (const b of conflicting) {
        conflicts.push({
          bookingId: b.id,
          customerName: b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'Unknown',
          serviceName: b.service?.name || 'Unknown',
          startTime: b.startTime,
          endTime: b.endTime,
        });
      }
    }

    return { available: conflicts.length === 0, conflicts };
  }
}
