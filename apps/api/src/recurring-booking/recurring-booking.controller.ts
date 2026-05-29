import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RecurringBookingService } from './recurring-booking.service';

@Controller('recurring-bookings')
@UseGuards(JwtAuthGuard)
export class RecurringBookingController {
  constructor(private readonly service: RecurringBookingService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Patch(':id/toggle')
  toggleActive(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.toggleActive(tenantId, id);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.delete(tenantId, id);
  }
}
