import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { BookingService } from './booking.service';
import { SchedulingService } from './scheduling.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly schedulingService: SchedulingService,
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

  @Patch(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bookingService.cancel(tenantId, id);
  }

  @Patch(':id/reschedule')
  reschedule(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.reschedule(tenantId, id, dto);
  }
}
