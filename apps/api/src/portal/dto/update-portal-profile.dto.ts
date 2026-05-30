import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdatePortalProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(20)
  phone?: string;
}
