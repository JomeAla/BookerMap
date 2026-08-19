import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

export class CheckoutSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsString()
  provider?: 'PAYSTACK' | 'FLUTTERWAVE';
}