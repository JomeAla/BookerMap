import { IsEnum, IsOptional, IsInt, IsString, IsDateString } from 'class-validator';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  tenantId: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsInt()
  price?: number;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;
}
