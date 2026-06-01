import { IsString, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';

export class SurveyDto {
  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsIn(['BOOKING_CREATED', 'SERVICE_COMPLETED', 'PAYMENT_MADE', 'GENERAL'])
  touchpoint: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsString()
  @IsOptional()
  scoreType?: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsString()
  @IsOptional()
  @IsIn(['cleanliness', 'punctuality', 'quality', 'communication', 'value'])
  category?: string;
}
