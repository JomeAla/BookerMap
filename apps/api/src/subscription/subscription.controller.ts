import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscription', description: 'Returns the active subscription for the current tenant' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionService.getActiveSubscription(user.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all subscriptions', description: 'Returns all subscriptions (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  async getAllSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptionService.getAllSubscriptions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a subscription', description: 'Create a subscription for a tenant (Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(dto.tenantId, dto);
  }

  @Patch('my/plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my plan', description: 'Upgrade or downgrade the current tenant subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  async updateMyPlan(@CurrentUser() user: any, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(user.tenantId, dto.plan, dto.billingCycle);
  }

  @Post('my/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my subscription', description: 'Cancel the current tenant subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancelMySubscription(@CurrentUser() user: any, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionService.cancelSubscription(user.tenantId, dto?.immediate);
  }

  @Get('my/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscription invoices', description: 'Returns invoices for the current tenant subscription' })
  @ApiResponse({ status: 200, description: 'Subscription invoices' })
  async getMyInvoices(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscriptionInvoices(user.tenantId);
  }
}
