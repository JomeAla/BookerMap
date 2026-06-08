import { Injectable, Logger } from '@nestjs/common';
import { PlatformSmsSettingsService } from './platform-sms-settings.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly platformSmsSettingsService: PlatformSmsSettingsService,
  ) {}

  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
    const settings = await this.platformSmsSettingsService.getDecryptedSettings();

    if (!settings?.whatsappAccessToken || !settings?.whatsappPhoneNumberId) {
      this.logger.warn('WhatsApp credentials not configured — skipping send');
      return { success: false, simulated: true, error: 'WhatsApp credentials not configured' };
    }

    const phoneId = settings.whatsappPhoneNumberId;
    const accessToken = settings.whatsappAccessToken;
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    const formattedTo = to.startsWith('+') ? to.substring(1) : to;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedTo,
          type: 'text',
          text: { body: message },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `WhatsApp API returned ${response.status}`;
        this.logger.error(`WhatsApp send failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${to}, id: ${messageId}`);
      return { success: true, messageId };
    } catch (err: any) {
      this.logger.error(`WhatsApp send error for ${to}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
    const settings = await this.platformSmsSettingsService.getDecryptedSettings();

    if (!settings?.whatsappAccessToken || !settings?.whatsappPhoneNumberId) {
      this.logger.warn('WhatsApp credentials not configured — skipping template send');
      return { success: false, simulated: true, error: 'WhatsApp credentials not configured' };
    }

    const phoneId = settings.whatsappPhoneNumberId;
    const accessToken = settings.whatsappAccessToken;
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    const formattedTo = to.startsWith('+') ? to.substring(1) : to;

    const components = Object.entries(params).map(([key, value]) => ({
      type: 'body',
      parameters: [{ type: 'text', text: value }],
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `WhatsApp API returned ${response.status}`;
        this.logger.error(`WhatsApp template send failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp template "${templateName}" sent to ${to}, id: ${messageId}`);
      return { success: true, messageId };
    } catch (err: any) {
      this.logger.error(`WhatsApp template send error for ${to}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  async verifyWebhook(mode: string, token: string, expectedToken: string): Promise<boolean> {
    if (mode !== 'subscribe') return false;

    const settings = await this.platformSmsSettingsService.getDecryptedSettings();
    const configuredToken = settings?.whatsappWebhookVerifyToken || expectedToken;
    return token === configuredToken;
  }

  async handleDeliveryWebhook(body: any): Promise<{ messageId: string; status: string }> {
    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (value?.statuses) {
        const statusInfo = value.statuses[0];
        const messageId = statusInfo?.id || 'unknown';
        const status = statusInfo?.status || 'unknown';
        const timestamp = statusInfo?.timestamp;
        const recipientId = statusInfo?.recipient_id;
        const errors = statusInfo?.errors;

        this.logger.log(`WhatsApp delivery status for ${messageId}: ${status}${errors ? `, errors: ${JSON.stringify(errors)}` : ''}`);

        return {
          messageId,
          status,
          ...timestamp && { timestamp },
          ...recipientId && { recipientId },
          ...errors && { errors },
        } as any;
      }

      if (value?.messages) {
        const msg = value.messages[0];
        this.logger.log(`WhatsApp inbound message from ${msg?.from}: ${msg?.text?.body?.substring(0, 50)}`);
        return { messageId: msg?.id || 'unknown', status: 'received' };
      }

      this.logger.warn('Unrecognized WhatsApp webhook payload structure');
      return { messageId: 'unknown', status: 'unrecognized' };
    } catch (err: any) {
      this.logger.error(`Error handling WhatsApp webhook: ${err.message}`, err.stack);
      return { messageId: 'unknown', status: 'error' };
    }
  }
}