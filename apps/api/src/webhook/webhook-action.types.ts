export const WEBHOOK_ACTIONS = [
  'trigger_ai',
  'check_availability',
  'create_booking',
  'get_booking_status',
  'get_customer_info',
] as const;

export type WebhookAction = (typeof WEBHOOK_ACTIONS)[number];

export interface WebhookActionResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}
