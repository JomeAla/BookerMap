import { IsString, IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  uploadedBy?: string;
}
