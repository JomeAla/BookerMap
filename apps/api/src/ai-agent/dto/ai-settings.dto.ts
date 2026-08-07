import { IsOptional, IsString, IsArray, IsObject, IsBoolean, IsInt, IsNumber, Min, Max } from 'class-validator';

export class AiSettingsDto {
  @IsOptional()
  @IsString()
  greeting?: string;

  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @IsOptional()
  @IsObject()
  businessHours?: Record<string, { open: string; close: string } | null>;

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsBoolean()
  enableResponseDelay?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  responseDelayMs?: number;

  @IsOptional()
  @IsBoolean()
  enableTypingIndicator?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  typingDurationMs?: number;
}
