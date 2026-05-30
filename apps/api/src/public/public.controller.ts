import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicCreateBookingDto } from './dto/public-create-booking.dto';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('tenants/:slug')
  getTenant(@Param('slug') slug: string) {
    return this.publicService.getTenantBySlug(slug);
  }

  @Get(':tenantSlug/services')
  getServices(@Param('tenantSlug') tenantSlug: string) {
    return this.publicService.getServices(tenantSlug);
  }

  @Get(':tenantSlug/slots')
  getSlots(
    @Param('tenantSlug') tenantSlug: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.publicService.getSlots(tenantSlug, serviceId, date);
  }

  @Post(':tenantSlug/bookings')
  createBooking(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: PublicCreateBookingDto,
  ) {
    return this.publicService.createBooking(tenantSlug, dto);
  }
}
