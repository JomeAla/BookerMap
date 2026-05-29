import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards, HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { BookingService } from './booking.service';
import { SchedulingService } from './scheduling.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    return this.bookingService.findAll(tenantId, { status, dateFrom, dateTo, technicianId });
  }

  @Get('available-slots')
  getAvailableSlots(
    @TenantId() tenantId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.schedulingService.getAvailableSlots(serviceId, date, tenantId);
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.findById(tenantId, id);
  }

  @Patch(':id')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });
    if (!booking) throw new HttpException('Booking not found', 404);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: body.status as any },
      include: { customer: true, service: true, technician: true, dispatch: true },
    });

    return { success: true, data: updated };
  }

  @Post(':id/dispatch')
  async dispatchTechnician(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { assignedToId?: string },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
    });
    if (!booking) throw new HttpException('Booking not found', 404);

    const existingDispatch = await this.prisma.dispatch.findUnique({
      where: { bookingId: id },
    });
    if (existingDispatch) throw new HttpException('Already dispatched', 409);

    const technicianId = body.assignedToId || booking.technicianId;
    if (!technicianId) throw new HttpException('No technician assigned to this booking', 400);

    const dispatch = await this.prisma.dispatch.create({
      data: { bookingId: id, assignedToId: technicianId, status: 'ASSIGNED' },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });

    return { success: true, data: dispatch };
  }

  @Patch(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.cancel(tenantId, id);
  }

  @Patch(':id/reschedule')
  reschedule(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.reschedule(tenantId, id, dto);
  }
}
