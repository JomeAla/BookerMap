import { CreateUserDto } from './create-user.dto';
import { IsString } from 'class-validator';

export class CreatePlatformUserDto extends CreateUserDto {
  @IsString()
  tenantId!: string;
}
