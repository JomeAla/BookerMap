import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class InitPosPaymentDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  terminalId?: string;

  @IsString()
  @IsIn(['paystack', 'flutterwave'])
  provider: 'paystack' | 'flutterwave';

  @IsString()
  invoiceId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
