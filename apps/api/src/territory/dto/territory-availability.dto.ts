import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DayAvailabilityDto {
  @IsOptional()
  start?: string; // "08:00"

  @IsOptional()
  end?: string; // "17:00"
}

export class TerritoryAvailabilityDto {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  availability!: Record<
    string,
    { start: string; end: string } | null
  >; // keys: monday..sunday; null = closed
}
