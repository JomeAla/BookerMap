import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export class CreateNotificationDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  recipient!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body!: string;
}
