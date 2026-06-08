import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class GrantSmsCreditsDto {
  @IsString()
  tenantId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SmsSettingsDto {
  @IsOptional()
  @IsString()
  smsProvider?: string;

  @IsOptional()
  @IsString()
  smsApiUsername?: string;

  @IsOptional()
  @IsString()
  smsApiKey?: string;

  @IsOptional()
  @IsString()
  smsApiSenderId?: string;

  @IsOptional()
  @IsString()
  smsShortCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  smsPricePerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  whatsappPricePerUnit?: number;
}

export class WhatsappSettingsDto {
  @IsOptional()
  @IsString()
  whatsappProvider?: string;

  @IsOptional()
  @IsString()
  whatsappAccessToken?: string;

  @IsOptional()
  @IsString()
  whatsappPhoneNumberId?: string;

  @IsOptional()
  @IsString()
  whatsappBusinessId?: string;

  @IsOptional()
  @IsString()
  whatsappWebhookVerifyToken?: string;
}

export class ToggleSmsSettingsDto {
  @IsBoolean()
  isActive: boolean;
}