import { IsString, IsArray, IsOptional, IsUrl, ArrayMinSize } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  events!: string[];

  @IsOptional()
  @IsString()
  secret?: string;
}
