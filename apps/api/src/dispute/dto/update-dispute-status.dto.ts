import { IsString } from 'class-validator';

export class UpdateDisputeStatusDto {
  @IsString()
  status!: string;
}
