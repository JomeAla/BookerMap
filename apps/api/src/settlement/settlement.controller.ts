import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { SettlementService } from './settlement.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { CompleteSettlementDto } from './dto/complete-settlement.dto';
import { FailSettlementDto } from './dto/fail-settlement.dto';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Post('generate')
  generate(
    @TenantId() tenantId: string,
    @Body() body: GenerateSettlementDto,
  ) {
    return this.settlementService.generateSettlement(tenantId, body.providerId, body.periodStart, body.periodEnd);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
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

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('summary')
  summary(@TenantId() tenantId: string) {
    return this.settlementService.getSettlementSummary(tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('outstanding/:providerId')
  outstanding(
    @TenantId() tenantId: string,
    @Param('providerId') providerId: string,
  ) {
    return this.settlementService.getProviderOutstanding(tenantId, providerId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('provider/:providerId')
  getProviderSettlements(
    @Param('providerId') providerId: string,
    @TenantId() tenantId: string,
  ) {
    return this.settlementService.getProviderSettlements(providerId, tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.settlementService.getSettlementById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/process')
  process(@Param('id') id: string) {
    return this.settlementService.markAsProcessing(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: CompleteSettlementDto,
  ) {
    return this.settlementService.markAsCompleted(id, body.paymentMethod, body.paymentReference);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/fail')
  fail(
    @Param('id') id: string,
    @Body() body: FailSettlementDto,
  ) {
    return this.settlementService.markAsFailed(id, body.notes);
  }
}
