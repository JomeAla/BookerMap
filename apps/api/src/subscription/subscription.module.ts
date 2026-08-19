import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PlanPricingService } from './plan-pricing.service';
import { PlanPricingController } from './plan-pricing.controller';
import { SubscriptionCron } from './subscription.cron';

@Module({
  imports: [PrismaModule, PaymentModule, ScheduleModule],
  controllers: [SubscriptionController, PlanPricingController],
  providers: [SubscriptionService, PlanPricingService, SubscriptionCron],
  exports: [SubscriptionService, PlanPricingService],
})
export class SubscriptionModule {}