import { IsString } from 'class-validator';

export class CompleteSettlementDto {
  @IsString()
  paymentMethod!: string;

  @IsString()
  paymentReference!: string;
}
