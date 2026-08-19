import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlanPricingService } from './plan-pricing.service';
import { UpsertPlanPricingDto } from './dto/upsert-plan-pricing.dto';

@ApiTags('Plan Pricing')
@Controller('plan-pricing')
export class PlanPricingController {
  constructor(private readonly planPricingService: PlanPricingService) {}

  @Get()
  @ApiOperation({ summary: 'List all plan pricing' })
  @ApiResponse({ status: 200, description: 'List of plan pricing' })
  async listPlans() {
    return this.planPricingService.listPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create or update a plan pricing (admin only)' })
  @ApiResponse({ status: 201, description: 'Plan pricing upserted' })
  async upsertPlan(@Body() dto: UpsertPlanPricingDto) {
    return this.planPricingService.upsertPlan(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('seed')
  @ApiOperation({ summary: 'Seed default plan pricing (admin only)' })
  @ApiResponse({ status: 201, description: 'Default plans seeded' })
  async seedDefaults() {
    return this.planPricingService.seedDefaults();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':plan/:billingCycle')
  @ApiOperation({ summary: 'Delete a plan pricing (admin only)' })
  @ApiResponse({ status: 200, description: 'Plan pricing deleted' })
  async deletePlan(@Param('plan') plan: string, @Param('billingCycle') billingCycle: string) {
    return this.planPricingService.deletePlan(plan as any, billingCycle as any);
  }
}