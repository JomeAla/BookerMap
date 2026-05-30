import { IsNumber, IsString, IsEmail } from 'class-validator';

export class ChargeCardDto {
  @IsNumber()
  amount: number;

  @IsEmail()
  email: string;
}
