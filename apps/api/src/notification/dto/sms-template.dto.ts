import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateSmsTemplateDto {
  @IsString()
  type!: string; // BOOKING_CONFIRMATION, BOOKING_REMINDER, EN_ROUTE, CUSTOM

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1600)
  body!: string; // supports {{variables}}

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSmsTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1600)
  body?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
