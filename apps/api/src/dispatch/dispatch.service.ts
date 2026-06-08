import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { AutoAssignmentService } from './auto-assignment.service';
import { BookingGateway } from '../gateway/booking.gateway';

type TimeBlock = { start: string; end: string };
type Availability = Record<string, TimeBlock[]> | null;

function isTechnicianAvailable(availability: Availability, dateTime: Date): boolean {
  if (!availability) return true;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[dateTime.getDay()];
  const slots = availability[dayName];
  if (!slots || slots.length === 0) return false;
  const time = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime.getMinutes().toString().padStart(2, '0')}`;
  return slots.some(s => time >= s.start && time <= s.end);
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private prisma: PrismaService,
    private autoAssignmentService: AutoAssignmentService,
    private bookingGateway: BookingGateway,
  ) {}

  async create(tenantId: string, dto: CreateDispatchDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, tenantId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const existing = await this.prisma.dispatch.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) throw new BadRequestException('Dispatch already exists for this booking');

    const technician = await this.prisma.user.findFirst({
      where: { id: dto.assignedToId, tenantId },
    });
    if (!technician) throw new NotFoundException('Technician not found');

    if (booking.startTime && !isTechnicianAvailable(technician.availability as Availability, new Date(booking.startTime))) {
      throw new BadRequestException('Technician is not available at the booking time');
    }

    return this.prisma.dispatch.create({
      data: {
        tenantId,
        bookingId: dto.bookingId,
        assignedToId: dto.assignedToId,
        status: 'ASSIGNED',
      },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.dispatch.findMany({
      where: { booking: { tenantId } },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id, booking: { tenantId } },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });
    if (!dispatch) throw new NotFoundException('Dispatch not found');
    return dispatch;
  }

  async updateStatus(tenantId: string, id: string, status: JobStatus) {
    await this.findById(tenantId, id);
    const data: any = { status };
    if (status === 'STARTED') data.startedAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();
    return this.prisma.dispatch.update({
      where: { id },
      data,
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });
  }

  async assignTechnician(tenantId: string, id: string, assignedToId: string) {
    const dispatch = await this.findById(tenantId, id);
    const technician = await this.prisma.user.findFirst({
      where: { id: assignedToId, tenantId },
    });
    if (!technician) throw new NotFoundException('Technician not found');

    if (dispatch.booking.startTime && !isTechnicianAvailable(technician.availability as Availability, new Date(dispatch.booking.startTime))) {
      throw new BadRequestException('Technician is not available at the booking time');
    }
    return this.prisma.dispatch.update({
      where: { id },
      data: { assignedToId },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });
  }

  async findJobsByTechnician(technicianId: string, tenantId: string) {
    const technician = await this.prisma.user.findFirst({
      where: { id: technicianId, tenantId },
    });
    if (!technician) throw new NotFoundException('Technician not found');
    return this.prisma.dispatch.findMany({
      where: { assignedToId: technicianId, booking: { tenantId } },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

    async autoAssign(bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            select: { id: true, tenantId: true, serviceId: true, startTime: true, technicianId: true },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        const existing = await this.prisma.dispatch.findUnique({ where: { bookingId } });
        if (existing) {
            this.logger.warn(`Dispatch already exists for booking ${bookingId}`);
            return existing;
        }

        const technicianId = await this.autoAssignmentService.findBestTechnician({
            serviceId: booking.serviceId,
            dateTime: booking.startTime,
            tenantId: booking.tenantId,
        });

        if (!technicianId) {
            this.logger.warn(`Could not auto-assign technician for booking ${bookingId}`);
            return null;
        }

        return this.prisma.dispatch.create({
            data: {
                tenantId: booking.tenantId,
                bookingId,
                assignedToId: technicianId,
                status: 'ASSIGNED',
            },
            include: {
                booking: { include: { customer: true, service: true } },
                assignedTo: true,
            },
        });
    }

    async offerJob(tenantId: string, bookingId: string, technicianIds: string[]) {
        // Check if booking exists and belongs to tenant
        const booking = await this.prisma.booking.findFirst({
            where: { id: bookingId, tenantId },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        // Check if dispatch already exists
        const existingDispatch = await this.prisma.dispatch.findUnique({ where: { bookingId } });
        if (existingDispatch) {
            // If dispatch exists, update it to offered status
            return this.prisma.dispatch.update({
                where: { id: existingDispatch.id },
                data: {
                    status: 'OFFERED',
                    offeredAt: new Date(),
                    assignedToId: null, // Clear assignment when offering
                },
                include: {
                    booking: { include: { customer: true, service: true } },
                    assignedTo: true,
                },
            });
        }

        // Create new dispatch with OFFERED status
        return this.prisma.dispatch.create({
            data: {
                bookingId,
                tenantId,
                status: 'OFFERED',
                offeredAt: new Date(),
            },
            include: {
                booking: { include: { customer: true, service: true } },
                assignedTo: true,
            },
        });
    }

    async acceptJob(tenantId: string, dispatchId: string, technicianId: string) {
        // Verify dispatch exists and belongs to tenant
        const dispatch = await this.prisma.dispatch.findFirst({
            where: { id: dispatchId, booking: { tenantId } },
            include: {
                booking: { include: { customer: true, service: true } },
                assignedTo: true,
            },
        });
        if (!dispatch) throw new NotFoundException('Dispatch not found');

        // Verify technician exists and belongs to tenant
        const technician = await this.prisma.user.findFirst({
            where: { id: technicianId, tenantId, role: 'TECHNICIAN' },
        });
        if (!technician) throw new NotFoundException('Technician not found');

        // Check if dispatch is in OFFERED status
        if (dispatch.status !== 'OFFERED') {
            throw new BadRequestException('Job is not in offered status');
        }

        // Accept the job
        return this.prisma.dispatch.update({
            where: { id: dispatchId },
            data: {
                status: 'ACCEPTED',
                acceptedAt: new Date(),
                assignedToId: technicianId,
            },
            include: {
                booking: { include: { customer: true, service: true } },
                assignedTo: true,
            },
        });
    }

    async getAvailableJobs(tenantId: string, technicianId?: string) {
        if (technicianId) {
            // Get jobs offered to specific technician
            // This would require a many-to-many relationship between dispatches and technicians for offers
            // For now, we'll return all offered jobs (simplified implementation)
            return this.prisma.dispatch.findMany({
                where: {
                    booking: { tenantId },
                    status: 'OFFERED',
                },
                include: {
                    booking: { include: { customer: true, service: true } },
                    assignedTo: true,
                },
                orderBy: { offeredAt: 'desc' },
            });
        } else {
            // Get all offered jobs
            return this.prisma.dispatch.findMany({
                where: {
                    booking: { tenantId },
                    status: 'OFFERED',
                },
                include: {
                    booking: { include: { customer: true, service: true } },
                    assignedTo: true,
                },
                orderBy: { offeredAt: 'desc' },
            });
        }
    }
}
