import { IsEnum, IsInt, IsOptional, IsBoolean, Min, IsNumber } from 'class-validator';
import { SubscriptionPlan, BillingCycle } from '@prisma/client';

export class UpsertPlanPricingDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  smsCredits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  whatsappCredits?: number;

  @IsOptional()
  features?: any;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}