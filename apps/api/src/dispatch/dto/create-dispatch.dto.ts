import { IsString } from 'class-validator';

export class CreateDispatchDto {
  @IsString()
  bookingId!: string;

  @IsString()
  assignedToId!: string;
}
