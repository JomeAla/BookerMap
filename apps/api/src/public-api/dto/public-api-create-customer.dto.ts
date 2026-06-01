import { IsString, IsOptional, IsEmail } from 'class-validator';

export class PublicApiCreateCustomerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    label?: string;
  };
}
