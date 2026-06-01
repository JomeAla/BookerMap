import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateLocationUpdateDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;
}
