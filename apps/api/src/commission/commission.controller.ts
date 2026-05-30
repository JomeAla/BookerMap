import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CommissionService } from './commission.service';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('technician/:id')
  getTechnicianCommission(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.commissionService.calculateTechnicianCommission(
      id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('summary')
  getSummary(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.commissionService.getSummary(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get()
  getAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.commissionService.getAllCommissions(tenantId, new Date(startDate), new Date(endDate));
  }
}
