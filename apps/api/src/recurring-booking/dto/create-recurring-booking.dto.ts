import { IsString, IsOptional, IsDateString, IsNumber, IsArray, IsEnum, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateRecurringBookingDto {
  @IsUUID()
  serviceId: string;

  @IsUUID()
  customerId: string;

  @IsUUID()
  @IsOptional()
  technicianId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(RecurringFrequency)
  @IsOptional()
  frequency?: RecurringFrequency;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  interval?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  intakeAnswers?: any[];

  @IsArray()
  @IsOptional()
  selectedModifiers?: string[];
}