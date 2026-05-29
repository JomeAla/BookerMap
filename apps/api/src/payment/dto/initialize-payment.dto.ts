import { IsString, IsOptional, IsIn } from 'class-validator';

export class InitializePaymentDto {
  @IsString()
  invoiceId!: string;

  @IsOptional()
  @IsString()
  @IsIn(['PAYSTACK', 'FLUTTERWAVE'])
  provider?: 'PAYSTACK' | 'FLUTTERWAVE';
}
