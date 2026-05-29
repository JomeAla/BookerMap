import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class TerritoryServiceDto {
  @IsString()
  serviceId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class CreateTerritoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  boundaries?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TerritoryServiceDto)
  services?: TerritoryServiceDto[];
}
