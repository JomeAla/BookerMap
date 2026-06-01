import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  trigger!: string;

  @IsString()
  triggerValue!: string;

  @IsOptional()
  @IsObject()
  nodes?: any;

  @IsOptional()
  @IsObject()
  edges?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsString()
  triggerValue?: string;

  @IsOptional()
  @IsObject()
  nodes?: any;

  @IsOptional()
  @IsObject()
  edges?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestFlowDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class FlowContext {
  message: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingId?: string;
  bookingStatus?: string;
  entities?: Record<string, any>;
}
