import { IsString } from 'class-validator';

export class FailSettlementDto {
  @IsString()
  notes!: string;
}
