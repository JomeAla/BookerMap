import { PartialType, OmitType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @IsNumber()
  @IsOptional()
  commissionRate?: number;

  @IsString()
  @IsOptional()
  commissionType?: string;
}
