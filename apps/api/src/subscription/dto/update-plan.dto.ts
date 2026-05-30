import { IsEnum, IsOptional } from 'class-validator';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

export class UpdatePlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}
