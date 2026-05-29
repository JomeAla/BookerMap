import { IsEnum } from 'class-validator';
import { JobStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(JobStatus)
  status!: JobStatus;
}
