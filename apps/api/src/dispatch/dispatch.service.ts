import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.dispatch.create({
      data: {
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
    await this.findById(tenantId, id);
    const technician = await this.prisma.user.findFirst({
      where: { id: assignedToId, tenantId },
    });
    if (!technician) throw new NotFoundException('Technician not found');
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
}
