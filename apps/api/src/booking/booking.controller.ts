import {
  Controller, Get, Post, Patch, Logger,
  Body, Param, Query, UseGuards, HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { BookingService } from './booking.service';
import { SchedulingService } from './scheduling.service';
import { SplitPaymentService } from '../split-payment/split-payment.service';
import { SatisfactionService } from '../satisfaction/satisfaction.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
    private readonly splitPaymentService: SplitPaymentService,
    private readonly satisfactionService: SatisfactionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@TenantId() tenantId: string, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings', description: 'Returns filtered list of bookings' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date filter' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date filter' })
  @ApiQuery({ name: 'technicianId', required: false, type: String, description: 'Filter by technician' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    return this.bookingService.findAll(tenantId, { status, dateFrom, dateTo, technicianId });
  }

  @Get('check-slot')
  @ApiOperation({ summary: 'Check slot availability', description: 'Check if a time slot is available for rescheduling' })
  @ApiQuery({ name: 'bookingId', required: true, type: String, description: 'Booking ID' })
  @ApiQuery({ name: 'startTime', required: true, type: String, description: 'New start time (ISO)' })
  @ApiQuery({ name: 'endTime', required: true, type: String, description: 'New end time (ISO)' })
  @ApiResponse({ status: 200, description: 'Slot availability result' })
  async checkSlot(
    @TenantId() tenantId: string,
    @Query('bookingId') bookingId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.schedulingService.checkSlotAvailability(bookingId, tenantId, new Date(startTime), new Date(endTime));
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available slots', description: 'Returns available time slots for a service on a date' })
  @ApiQuery({ name: 'serviceId', required: true, type: String, description: 'Service ID' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Available time slots' })
  getAvailableSlots(
    @TenantId() tenantId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.schedulingService.getAvailableSlots(serviceId, date, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
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
      include: { customer: true, service: true, technician: true, dispatch: true, invoices: { where: { status: 'PAID' } } },
    });

    if (body.status === 'COMPLETED' && updated.invoices?.length > 0) {
      for (const inv of updated.invoices) {
        this.splitPaymentService.createSplitPayment(updated.id, inv.id)
          .catch(err => this.logger.error('Failed to create split payment', err));
      }
    }

    if (body.status === 'COMPLETED') {
      this.satisfactionService.recordSurvey(tenantId, {
        bookingId: id,
        customerId: updated.customerId,
        touchpoint: 'SERVICE_COMPLETED',
        score: 5,
        scoreType: 'CSAT',
      }).catch(err => this.logger.error('Failed to record auto survey', err));

      this.logger.log(`Satisfaction survey triggered for booking ${id}`);
    }

    return { success: true, data: updated };
  }

  @Post(':id/dispatch')
  @ApiOperation({ summary: 'Dispatch technician', description: 'Assign a technician to a booking and create dispatch record' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 201, description: 'Technician dispatched' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Already dispatched' })
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
      data: { tenantId, bookingId: id, assignedToId: technicianId, status: 'ASSIGNED' },
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });

    return { success: true, data: dispatch };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.cancel(tenantId, id);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking rescheduled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  reschedule(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.reschedule(tenantId, id, dto);
  }
}
