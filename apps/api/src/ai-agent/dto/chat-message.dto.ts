import { IsOptional, IsString, IsObject, IsInt, Min, Max, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export interface PaymentAction {
  type: 'pay_now' | 'pay_later' | 'payment_confirmed' | 'payment_failed';
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentLink?: string;
  reference?: string;
  invoiceId?: string;
}

export class ChatResponse {
  reply!: string;
  intent!: string;
  entities!: EntityMap;
  conversationId!: string;
  messageId?: string;
  action?: string;
  quickReplies?: string[];
  paymentAction?: PaymentAction;
}

export interface EntityMap {
  date?: string;
  time?: string;
  service?: string;
  name?: string;
  phone?: string;
  email?: string;
  bookingId?: string;
  amount?: string;
  invoiceNumber?: string;
  reference?: string;
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

export class RateMessageDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
