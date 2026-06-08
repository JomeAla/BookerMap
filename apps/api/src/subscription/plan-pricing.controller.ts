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
    const data = await this.planPricingService.listPlans();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create or update a plan pricing (admin only)' })
  @ApiResponse({ status: 201, description: 'Plan pricing upserted' })
  async upsertPlan(@Body() dto: UpsertPlanPricingDto) {
    const data = await this.planPricingService.upsertPlan(dto);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('seed')
  @ApiOperation({ summary: 'Seed default plan pricing (admin only)' })
  @ApiResponse({ status: 201, description: 'Default plans seeded' })
  async seedDefaults() {
    const data = await this.planPricingService.seedDefaults();
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':plan/:billingCycle')
  @ApiOperation({ summary: 'Delete a plan pricing (admin only)' })
  @ApiResponse({ status: 200, description: 'Plan pricing deleted' })
  async deletePlan(@Param('plan') plan: string, @Param('billingCycle') billingCycle: string) {
    const data = await this.planPricingService.deletePlan(plan as any, billingCycle as any);
    return { success: true, data };
  }
}