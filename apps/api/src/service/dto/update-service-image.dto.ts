import { IsString, IsOptional } from 'class-validator';

export class UpdateServiceImageDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
