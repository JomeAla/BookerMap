import { IsArray, IsString, MinLength } from 'class-validator';

export class SendTeamNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;
}
