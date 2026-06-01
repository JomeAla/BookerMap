import { IsOptional, IsString, IsEnum } from 'class-validator';
import { EscalationStatus, EscalationPriority } from '@prisma/client';

export class EscalateDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(EscalationPriority)
  priority?: EscalationPriority;
}

export class AssignEscalationDto {
  @IsString()
  agentUserId: string;
}

export class ResolveEscalationDto {
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class EscalationFilterDto {
  @IsOptional()
  @IsEnum(EscalationStatus)
  status?: EscalationStatus;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
