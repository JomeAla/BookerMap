import { IsOptional, IsString, IsObject } from 'class-validator';

export class ChatMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChatResponse {
  reply!: string;
  intent!: string;
  entities!: EntityMap;
  conversationId!: string;
  action?: string;
  quickReplies?: string[];
}

export interface EntityMap {
  date?: string;
  time?: string;
  service?: string;
  name?: string;
  phone?: string;
  email?: string;
  bookingId?: string;
}

export interface ConversationState {
  intent: string;
  entities: EntityMap;
  missingFields: string[];
  step: number;
  metadata?: Record<string, any>;
}

export class CreateResponseDto {
  @IsString()
  trigger!: string;

  @IsString()
  response!: string;

  @IsOptional()
  @IsString()
  language?: string;
}
