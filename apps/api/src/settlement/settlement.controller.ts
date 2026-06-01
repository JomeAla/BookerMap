import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { SettlementService } from './settlement.service';

@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post('generate')
  generate(
    @TenantId() tenantId: string,
    @Body() body: { providerId: string; periodStart: string; periodEnd: string },
  ) {
    return this.settlementService.generateSettlement(tenantId, body.providerId, body.periodStart, body.periodEnd);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.settlementService.getSettlements(tenantId, { status, providerId, dateFrom, dateTo });
  }

  @Get('summary')
  summary(@TenantId() tenantId: string) {
    return this.settlementService.getSettlementSummary(tenantId);
  }

  @Get('outstanding/:providerId')
  outstanding(
    @TenantId() tenantId: string,
    @Param('providerId') providerId: string,
  ) {
    return this.settlementService.getProviderOutstanding(tenantId, providerId);
  }

  @Get('provider/:providerId')
  getProviderSettlements(
    @Param('providerId') providerId: string,
    @TenantId() tenantId: string,
  ) {
    return this.settlementService.getProviderSettlements(providerId, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.settlementService.getSettlementById(id);
  }

  @Patch(':id/process')
  process(@Param('id') id: string) {
    return this.settlementService.markAsProcessing(id);
  }

  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: { paymentMethod: string; paymentReference: string },
  ) {
    return this.settlementService.markAsCompleted(id, body.paymentMethod, body.paymentReference);
  }

  @Patch(':id/fail')
  fail(
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    return this.settlementService.markAsFailed(id, body.notes);
  }
}
