import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

export class AiSettingsDto {
  @IsOptional()
  @IsString()
  greeting?: string;

  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @IsOptional()
  @IsObject()
  businessHours?: Record<string, any>;

  @IsOptional()
  @IsArray()
  languages?: string[];
}
