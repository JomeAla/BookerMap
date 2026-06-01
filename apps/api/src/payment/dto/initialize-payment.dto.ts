import { IsString, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export class InitializePaymentDto {
  @IsString()
  invoiceId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['PAYSTACK', 'FLUTTERWAVE'])
  provider?: 'PAYSTACK' | 'FLUTTERWAVE';
}
