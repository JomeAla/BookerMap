import { IsString, IsOptional } from 'class-validator';

export class FlutterwaveSettingsDto {
  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsString()
  encryptionKey?: string;
}
