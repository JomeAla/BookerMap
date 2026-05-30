import { IsObject, IsOptional } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsObject()
  @IsOptional()
  availability?: Record<string, Array<{ start: string; end: string }>>;
}
