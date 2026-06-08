import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PublicService } from './public.service';
import { PublicCreateBookingDto } from './dto/public-create-booking.dto';

@ApiTags('Public')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics', description: 'Returns public platform statistics (no auth required)' })
  @ApiResponse({ status: 200, description: 'Platform stats' })
  getStats() {
    return this.publicService.getStats();
  }

  @Get('tenants/resolve')
  @ApiOperation({ summary: 'Resolve tenant from custom domain', description: 'Returns tenant info resolved from the Host header (custom domain)' })
  @ApiResponse({ status: 200, description: 'Tenant info' })
  @ApiResponse({ status: 404, description: 'No tenant found for domain' })
  resolveTenant(@Req() req: Request) {
    const domainInfo = (req as any).tenantFromDomain;
    if (!domainInfo) {
      return this.publicService.getTenantBySlug('');
    }
    return this.publicService.getTenantById(domainInfo.tenantId);
  }

  @Get('tenants/:slug')
  @ApiOperation({ summary: 'Get public tenant info', description: 'Returns public tenant information by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'Tenant info' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getTenant(@Param('slug') slug: string) {
    return this.publicService.getTenantBySlug(slug);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get public services (domain resolved)', description: 'Returns services resolved from the Host header (custom domain)' })
  @ApiResponse({ status: 200, description: 'List of services' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  getServicesFromDomain(@Req() req: Request) {
    const domainInfo = (req as any).tenantFromDomain;
    if (!domainInfo) {
      const { data } = req.query as any;
      return this.publicService.getServices(data || '');
    }
    return this.publicService.getServicesByTenantId(domainInfo.tenantId);
  }

  @Get(':tenantSlug/services')
  @ApiOperation({ summary: 'Get public services', description: 'Returns services for a tenant by slug' })
  @ApiParam({ name: 'tenantSlug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'List of services' })
  getServices(@Param('tenantSlug') tenantSlug: string) {
    return this.publicService.getServices(tenantSlug);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get available time slots (domain resolved)', description: 'Returns available booking slots resolved from Host header' })
  @ApiQuery({ name: 'serviceId', required: true, type: String, description: 'Service ID' })
  @ApiQuery({ name: 'date', required: true, type: String, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Available slots' })
  getSlotsFromDomain(
    @Req() req: Request,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    const domainInfo = (req as any).tenantFromDomain;
    if (!domainInfo) {
      return this.publicService.getSlots('', serviceId, date);
    }
    return this.publicService.getSlotsByTenantId(domainInfo.tenantId, serviceId, date);
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

  @Post('bookings')
  @ApiOperation({ summary: 'Create public booking (domain resolved)', description: 'Create a booking resolved from Host header (custom domain)' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  createBookingFromDomain(
    @Req() req: Request,
    @Body() dto: PublicCreateBookingDto,
  ) {
    const domainInfo = (req as any).tenantFromDomain;
    if (!domainInfo) {
      return this.publicService.createBooking('', dto);
    }
    return this.publicService.createBookingByTenantId(domainInfo.tenantId, dto);
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
