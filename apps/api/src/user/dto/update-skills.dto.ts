import { IsArray, IsString } from 'class-validator';
export class UpdateSkillsDto {
  @IsArray()
  @IsString({ each: true })
  skills: string[];
}
