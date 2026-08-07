import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RecurringPaymentService } from './recurring-payment.service';

@ApiTags('Recurring Payments')
@ApiBearerAuth()
@Controller('recurring-payments')
@UseGuards(JwtAuthGuard)
export class RecurringPaymentController {
  constructor(private readonly service: RecurringPaymentService) {}

  @Get()
  @ApiOperation({ summary: 'List recurring payments' })
  @ApiResponse({ status: 200, description: 'List of recurring payments' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring payment by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Recurring payment found' })
  @ApiResponse({ status: 404, description: 'Recurring payment not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle recurring payment active state' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Recurring payment toggled' })
  toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.toggle(tenantId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get recurring payment logs' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Recurring payment logs' })
  getLogs(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getLogs(tenantId, id);
  }
}
