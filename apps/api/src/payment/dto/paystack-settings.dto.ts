import { IsString, IsOptional } from 'class-validator';

export class PaystackSettingsDto {
  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
}
