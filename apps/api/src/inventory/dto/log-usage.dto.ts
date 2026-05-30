import { IsString, IsNumber, Min } from 'class-validator';

export class LogUsageDto {
  @IsString()
  bookingId!: string;

  @IsString()
  itemId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}
