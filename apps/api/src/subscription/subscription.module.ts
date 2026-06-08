import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PlanPricingService } from './plan-pricing.service';
import { PlanPricingController } from './plan-pricing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionController, PlanPricingController],
  providers: [SubscriptionService, PlanPricingService],
  exports: [SubscriptionService, PlanPricingService],
})
export class SubscriptionModule {}
