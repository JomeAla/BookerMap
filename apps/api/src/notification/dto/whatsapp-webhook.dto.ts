import { IsString, IsOptional } from 'class-validator';

export class WhatsAppWebhookQueryDto {
  @IsOptional()
  @IsString()
  'hub.mode'?: string;

  @IsOptional()
  @IsString()
  'hub.challenge'?: string;

  @IsOptional()
  @IsString()
  'hub.verify_token'?: string;
}
