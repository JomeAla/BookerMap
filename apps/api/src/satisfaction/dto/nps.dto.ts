import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class NpsDto {
  @IsString()
  customerId: string;

  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
