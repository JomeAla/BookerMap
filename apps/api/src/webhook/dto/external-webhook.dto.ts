import { IsString, IsObject, IsOptional, IsIn } from 'class-validator';
import { WEBHOOK_ACTIONS } from '../webhook-action.types';

export class ExternalWebhookDto {
  @IsString()
  @IsIn([...WEBHOOK_ACTIONS])
  action!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class ExternalWebhookHeaders {
  'x-webhook-secret': string;
  'x-tenant-slug': string;
}
