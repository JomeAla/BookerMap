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

    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const slots: Array<{
      technicianId: string;
      technicianName: string;
      startTime: Date;
      endTime: Date;
    }> = [];

    for (const tech of technicians) {
      const bookings = await this.prisma.booking.findMany({
        where: {
          technicianId: tech.id,
          startTime: { gte: dayStart },
          endTime: { lte: new Date(dayEnd.getTime() + 86400000) },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        },
        orderBy: { startTime: 'asc' },
      });

      const slotDuration = service.duration * 60 * 1000;
      const intervalMs = 30 * 60 * 1000;
      const bufferMs = 30 * 60 * 1000;
      let currentTime = new Date(dayStart);

      while (currentTime.getTime() + slotDuration <= dayEnd.getTime()) {
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
}
