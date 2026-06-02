import { IsString, IsOptional } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  resolution!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
