import { IsString, IsOptional } from 'class-validator';

export class AddEvidenceDto {
  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsString()
  fileData!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
