import { IsString, IsOptional, IsNumber } from 'class-validator';

export class SaveCardDto {
  @IsString()
  customerId: string;

  @IsString()
  authorizationCode: string;

  @IsString()
  last4: string;

  @IsString()
  brand: string;

  @IsOptional()
  @IsNumber()
  expMonth?: number;

  @IsOptional()
  @IsNumber()
  expYear?: number;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  cardType?: string;
}
