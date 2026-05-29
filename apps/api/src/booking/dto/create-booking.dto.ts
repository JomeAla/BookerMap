import { IsString, IsOptional, IsArray, IsDateString, IsObject } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  serviceId!: string;

  @IsString()
  customerId!: string;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  intakeAnswers?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedModifiers?: string[];
}
