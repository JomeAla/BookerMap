import { IsOptional, IsString, IsUrl } from 'class-validator';

export class PushPayloadDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
