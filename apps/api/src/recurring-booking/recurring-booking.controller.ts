import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RecurringBookingService } from './recurring-booking.service';
import { CreateRecurringBookingDto } from './dto/create-recurring-booking.dto';

@ApiTags('Recurring Bookings')
@ApiBearerAuth()
@Controller('recurring-bookings')
@UseGuards(JwtAuthGuard)
export class RecurringBookingController {
  constructor(private readonly service: RecurringBookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring booking', description: 'Create a new recurring booking schedule' })
  @ApiResponse({ status: 201, description: 'Recurring booking created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateRecurringBookingDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List recurring bookings', description: 'Returns all recurring bookings for the tenant' })
  @ApiResponse({ status: 200, description: 'List of recurring bookings' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring booking by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Recurring booking ID' })
  @ApiResponse({ status: 200, description: 'Recurring booking found' })
  @ApiResponse({ status: 404, description: 'Recurring booking not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle recurring booking active status', description: 'Activate or deactivate a recurring booking schedule' })
  @ApiParam({ name: 'id', type: String, description: 'Recurring booking ID' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  toggleActive(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.toggleActive(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring booking' })
  @ApiParam({ name: 'id', type: String, description: 'Recurring booking ID' })
  @ApiResponse({ status: 200, description: 'Recurring booking deleted' })
  @ApiResponse({ status: 404, description: 'Recurring booking not found' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.delete(tenantId, id);
  }
}
