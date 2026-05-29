import { IsString, IsOptional, IsObject } from 'class-validator';

export class EmailTemplateDto {
  @IsString()
  to!: string;

  @IsString()
  subject!: string;

  @IsString()
  templateName!: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;
}
