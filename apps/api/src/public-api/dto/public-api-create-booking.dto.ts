import { IsString, IsOptional, IsDateString, IsEmail, IsArray, IsNumber } from 'class-validator';

export class PublicApiCreateBookingDto {
  @IsString()
  serviceId: string;

  @IsString()
  customerId: string;

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  selectedModifiers?: string[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}
