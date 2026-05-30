import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsInt()
  @Min(1)
  triggerDays!: number;

  @IsOptional()
  @IsString()
  triggerType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  discountPercent?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
