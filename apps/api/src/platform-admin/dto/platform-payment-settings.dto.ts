import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class PlatformPaystackSettingsDto {
  @IsOptional()
  @IsString()
  paystackPublicKey?: string;

  @IsOptional()
  @IsString()
  paystackSecretKey?: string;

  @IsOptional()
  @IsString()
  paystackWebhookSecret?: string;
}

export class PlatformFlutterwaveSettingsDto {
  @IsOptional()
  @IsString()
  flutterwavePublicKey?: string;

  @IsOptional()
  @IsString()
  flutterwaveSecretKey?: string;

  @IsOptional()
  @IsString()
  flutterwaveEncryptionKey?: string;

  @IsOptional()
  @IsString()
  flutterwaveWebhookSecret?: string;
}

export class PlatformPaymentSettingsUpdateDto {
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}