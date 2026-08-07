import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

export class CreateWhatsAppTemplateDto {
  @IsString()
  templateName!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  @MaxLength(4096)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paramKeys?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWhatsAppTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateName?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paramKeys?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
