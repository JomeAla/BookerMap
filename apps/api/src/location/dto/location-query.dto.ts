import { IsOptional, IsString } from 'class-validator';

export class LocationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
