import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}