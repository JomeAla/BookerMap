import { IsString, IsOptional, IsDateString, IsEmail } from 'class-validator';

export class PublicCreateBookingDto {
  @IsString()
  serviceId: string;

  @IsDateString()
  startTime: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}
