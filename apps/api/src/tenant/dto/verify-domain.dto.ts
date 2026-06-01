import { IsOptional, IsBoolean } from 'class-validator';

export class VerifyDomainDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
