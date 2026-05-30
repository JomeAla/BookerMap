import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutoAssignmentService {
  private readonly logger = new Logger(AutoAssignmentService.name);

  constructor(private prisma: PrismaService) {}

  async findBestTechnician(booking: { serviceId: string; dateTime: Date; addressId?: string; tenantId: string }): Promise<string | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: booking.serviceId },
      select: { name: true, category: true },
    });

    const technicians = await this.prisma.user.findMany({
      where: {
        tenantId: booking.tenantId,
        role: 'TECHNICIAN',
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        skills: true,
        availability: true,
      },
    });

    if (technicians.length === 0) {
      this.logger.warn('No technicians available for auto-assignment');
      return null;
    }

    const available = technicians.filter(t => this.isAvailable(t.availability as any, booking.dateTime));

    if (available.length === 0) {
      this.logger.warn('No available technicians at requested time');
      return null;
    }

    const dayStart = new Date(booking.dateTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const bookingCounts = await Promise.all(
      available.map(async (tech) => {
        const count = await this.prisma.booking.count({
          where: {
            technicianId: tech.id,
            startTime: { gte: dayStart, lt: dayEnd },
            status: { not: 'CANCELLED' },
          },
        });
        return { techId: tech.id, count };
      })
    );

    bookingCounts.sort((a, b) => a.count - b.count);
    this.logger.log(`Auto-assigned technician ${bookingCounts[0].techId} (${bookingCounts[0].count} bookings that day)`);
    return bookingCounts[0].techId;
  }

  private isAvailable(availability: Record<string, { start: string; end: string }[]> | null, dateTime: Date): boolean {
    if (!availability) return true;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dateTime.getDay()];
    const slots = availability[dayName];
    if (!slots || slots.length === 0) return false;
    const time = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}`;
    return slots.some(s => time >= s.start && time <= s.end);
  }
}
