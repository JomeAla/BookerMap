import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResponseService {
  private readonly defaultTemplates: Record<string, string> = {
    GREETING: 'Hello! Welcome to {{businessName}}. How can I help you today? You can book a service, check an appointment, or ask about pricing.',
    BOOKING_CREATE: "I'd be happy to help you book a {{service}}! What date works best for you?",
    BOOKING_CREATE_TIME: 'Great, {{date}} works! What time would you prefer?',
    BOOKING_CREATE_NAME: 'Almost done! Could you please provide your name?',
    BOOKING_CREATE_PHONE: 'Thanks {{name}}! And your phone number so we can confirm the booking?',
    BOOKING_CONFIRM: "Great! I've booked a {{service}} for {{date}} at {{time}}. Your booking reference is {{bookingId}}. Is there anything else I can help with?",
    BOOKING_CANCEL: 'I can help cancel your booking. Could you please provide your booking reference number or the phone number used for the booking?',
    BOOKING_CANCELLED: 'Your booking {{bookingId}} has been successfully cancelled.',
    BOOKING_NOT_FOUND: "I couldn't find a booking matching that information. Please check your booking reference or phone number and try again.",
    BOOKING_RESCHEDULE: "I'd be happy to reschedule your booking. Could you provide your booking reference or the phone number used?",
    BOOKING_RESCHEDULED: 'Your booking {{bookingId}} has been rescheduled to {{date}} at {{time}}.',
    BOOKING_STATUS: 'Let me look up your booking status. Could you provide your phone number or booking reference?',
    BOOKING_STATUS_RESULT: 'Your booking {{bookingId}} for {{service}} on {{date}} at {{time}} is currently {{status}}.',
    PAYMENT_INQUIRY: 'Let me check your invoices. Could you provide your phone number or email on file?',
    PAYMENT_RESULT: 'You have an invoice ({{invoiceNumber}}) for {{amount}}. You can pay using this link: {{paymentLink}}',
    PAYMENT_NONE: "I couldn't find any outstanding invoices for your account.",
    PRICE_INQUIRY: 'The {{service}} costs {{price}}. Would you like to book this service?',
    PRICE_NOT_FOUND: "I couldn't find pricing information for {{service}}. Please check the service name and try again.",
    FALLBACK: "I'm not sure I understood that. You can say things like 'book a service', 'check my appointment', or 'what are your prices'.",
    ASK_SERVICE: 'What service would you like to book?',
    ASK_DATE: 'What date would you like to schedule for?',
    ASK_TIME: 'What time works best for you?',
    ASK_NAME: 'Could you please tell me your name?',
    ASK_PHONE: 'And your phone number please?',
    CONFIRM_BOOKING: 'Just to confirm: {{service}} on {{date}} at {{time}} for {{name}}. Shall I go ahead and book this?',
  };

  private readonly variations: Record<string, string[]> = {
    GREETING: [
      'Hello! Welcome to {{businessName}}. How can I assist you today?',
      'Hi there! Thanks for reaching out. How can I help you?',
      'Hey! How can I make your day better?',
    ],
    BOOKING_CREATE: [
      "I'd love to help you book that! What date are you thinking?",
      'Sure! Let me help you schedule that. When would you like to come in?',
      'Great choice! What day works best for you?',
    ],
    FALLBACK: [
      "Sorry, I didn't quite catch that. You can try asking to book a service or check an appointment.",
      "Hmm, I'm not sure what you mean. Try saying something like 'I want to book a haircut' or 'check my booking'.",
      "I didn't understand that. Here are some things you can ask: book a service, check your appointment, or ask about prices.",
    ],
  };

  constructor(private readonly prisma: PrismaService) {}

  async getResponse(templateKey: string, variables: Record<string, string>, tenantId: string): Promise<string> {
    let template = await this.loadCustomResponse(templateKey, tenantId);
    if (!template) {
      template = this.defaultTemplates[templateKey];
    }
    if (!template) {
      template = this.defaultTemplates.FALLBACK;
    }
    return this.substituteVariables(template, variables);
  }

  getRandomVariation(templates: string[]): string {
    const idx = Math.floor(Math.random() * templates.length);
    return templates[idx];
  }

  async getVariedResponse(templateKey: string, variables: Record<string, string>, tenantId: string): Promise<string> {
    const customVariations = this.variations[templateKey];
    if (customVariations && customVariations.length > 0) {
      const chosen = customVariations[Math.floor(Math.random() * customVariations.length)];
      return this.substituteVariables(chosen, variables);
    }
    let template = await this.loadCustomResponse(templateKey, tenantId);
    if (!template) {
      template = this.defaultTemplates[templateKey];
    }
    if (!template) {
      template = this.defaultTemplates.FALLBACK;
    }
    return this.substituteVariables(template, variables);
  }

  private async loadCustomResponse(trigger: string, tenantId: string): Promise<string | null> {
    try {
      const resp = await this.prisma.aiResponse.findFirst({
        where: { trigger, tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return resp?.response || null;
    } catch {
      return null;
    }
  }

  private substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return result;
  }
}
