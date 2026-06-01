import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicService } from './public.service';
import { PublicCreateBookingDto } from './dto/public-create-booking.dto';

@ApiTags('Public')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('tenants/:slug')
  @ApiOperation({ summary: 'Get public tenant info', description: 'Returns public tenant information by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'Tenant info' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenant(@Param('slug') slug: string) {
    return this.publicService.getTenantBySlug(slug);
  }

  @Get(':tenantSlug/services')
  @ApiOperation({ summary: 'Get public services', description: 'Returns services for a tenant by slug' })
  @ApiParam({ name: 'tenantSlug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'List of services' })
  getServices(@Param('tenantSlug') tenantSlug: string) {
    return this.publicService.getServices(tenantSlug);
  }

  @Get(':tenantSlug/slots')
  @ApiOperation({ summary: 'Get available time slots', description: 'Returns available booking slots for a service and date' })
  @ApiParam({ name: 'tenantSlug', type: String, description: 'Tenant slug' })
  @ApiQuery({ name: 'serviceId', required: true, type: String, description: 'Service ID' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Available slots' })
  getSlots(
    @Param('tenantSlug') tenantSlug: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.publicService.getSlots(tenantSlug, serviceId, date);
  }

  @Post(':tenantSlug/bookings')
  @ApiOperation({ summary: 'Create public booking', description: 'Create a booking from the public booking widget' })
  @ApiParam({ name: 'tenantSlug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  createBooking(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: PublicCreateBookingDto,
  ) {
    return this.publicService.createBooking(tenantSlug, dto);
  }
}
