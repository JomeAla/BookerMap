import { IsString, IsOptional } from 'class-validator';

export class WhatsAppSettingsDto {
  @IsOptional()
  @IsString()
  whatsappPhoneNumberId?: string;

  @IsOptional()
  @IsString()
  whatsappBusinessAccountId?: string;

  @IsOptional()
  @IsString()
  whatsappAccessToken?: string;
}
