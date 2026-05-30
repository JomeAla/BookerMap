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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionService.getActiveSubscription(user.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(dto.tenantId, dto);
  }

  @Patch('my/plan')
  @UseGuards(JwtAuthGuard)
  async updateMyPlan(@CurrentUser() user: any, @Body() dto: UpdatePlanDto) {
    return this.subscriptionService.updatePlan(user.tenantId, dto.plan, dto.billingCycle);
  }

  @Post('my/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelMySubscription(@CurrentUser() user: any, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionService.cancelSubscription(user.tenantId, dto?.immediate);
  }

  @Get('my/invoices')
  @UseGuards(JwtAuthGuard)
  async getMyInvoices(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscriptionInvoices(user.tenantId);
  }
}
