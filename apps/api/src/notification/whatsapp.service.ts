import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    this.logger.log(`[WHATSAPP STUB] To: ${to}, Message: ${message}`);
    return { success: true, messageId: `wa_${Date.now()}` };
  }

  async sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<{ success: boolean; messageId?: string }> {
    this.logger.log(`[WHATSAPP STUB] To: ${to}, Template: ${templateName}, Params: ${JSON.stringify(params)}`);
    return { success: true, messageId: `wa_${Date.now()}` };
  }

  async verifyWebhook(mode: string, token: string, expectedToken: string): Promise<boolean> {
    return mode === 'subscribe' && token === expectedToken;
  }

  async handleDeliveryWebhook(body: any): Promise<{ messageId: string; status: string }> {
    this.logger.log(`[WHATSAPP STUB] Delivery webhook: ${JSON.stringify(body)}`);
    return { messageId: body?.entry?.[0]?.changes?.[0]?.value?.message_id || 'unknown', status: 'delivered' };
  }
}
