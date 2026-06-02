import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  type!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
