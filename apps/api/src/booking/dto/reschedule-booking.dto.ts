import { IsDateString, IsOptional } from 'class-validator';

export class RescheduleBookingDto {
  @IsDateString()
  newStartTime!: string;

  @IsOptional()
  @IsDateString()
  newEndTime?: string;
}
