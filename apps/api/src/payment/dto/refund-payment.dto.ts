import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  paymentId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
}
