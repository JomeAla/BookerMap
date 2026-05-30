import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, Min } from 'class-validator';

export class CreatePricingRuleDto {
  @IsString()
  name!: string;

  @IsEnum(['SURGE', 'OFF_PEAK', 'PROMO'])
  type!: 'SURGE' | 'OFF_PEAK' | 'PROMO';

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsArray()
  daysOfWeek?: string[];

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minHoursBeforeBooking?: number;

  @IsOptional()
  @IsString()
  adjustmentType?: string;

  @IsNumber()
  adjustmentValue!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
