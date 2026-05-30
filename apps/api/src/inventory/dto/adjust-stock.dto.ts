import { IsNumber } from 'class-validator';

export class AdjustStockDto {
  @IsNumber()
  delta!: number;
}
