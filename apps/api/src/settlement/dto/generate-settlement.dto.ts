import { IsString } from 'class-validator';

export class GenerateSettlementDto {
  @IsString()
  providerId!: string;

  @IsString()
  periodStart!: string;

  @IsString()
  periodEnd!: string;
}
