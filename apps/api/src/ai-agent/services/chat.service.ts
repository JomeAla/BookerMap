import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationEngine } from './conversation.engine';
import { ResponseService } from './response.service';
import { TaskExecutor } from './task-executor.service';
import { EntityMap, ConversationState, ChatResponse } from '../dto/chat-message.dto';

@Injectable()
export class ChatService {
  private readonly contexts = new Map<string, ConversationState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ConversationEngine,
    private readonly responseService: ResponseService,
    private readonly taskExecutor: TaskExecutor,
  ) {}

  async processMessage(
    message: string,
    tenantId: string,
    conversationId?: string,
  ): Promise<ChatResponse> {
    const conversation = await this.loadOrCreateConversation(tenantId, conversationId);
    const convId = conversation.id;

    let context = this.contexts.get(convId) || this.createNewContext();

    await this.saveMessage(convId, 'user', message, context.intent, context.entities);

    if (message.toLowerCase() === 'yes' && context.intent === 'BOOKING_CREATE' && context.step === 99) {
      context.step = 100;
      const result = await this.taskExecutor.executeTask('BOOKING_CREATE', context.entities, context, tenantId);
      if (result.success) {
        const reply = await this.responseService.getResponse('BOOKING_CONFIRM', {
          service: result.data.service,
          date: result.data.date,
          time: result.data.time,
          bookingId: result.data.bookingId.slice(0, 8).toUpperCase(),
        }, tenantId);
        context = this.createNewContext();
        this.contexts.set(convId, context);
        await this.saveMessage(convId, 'assistant', reply, 'BOOKING_CONFIRM', context.entities);
        return { reply, intent: 'BOOKING_CONFIRM', entities: context.entities, conversationId: convId };
      }
      context.step = 0;
    }

    const intent = this.engine.detectIntent(message);
    let entities = this.engine.extractEntities(message);

    if (conversation.metadata && typeof conversation.metadata === 'object' && !Array.isArray(conversation.metadata)) {
      const meta = conversation.metadata as Record<string, any>;
      if (meta.knownServices && Array.isArray(meta.knownServices)) {
        this.engine.setKnownServices(meta.knownServices as string[]);
      }
    }

    if (intent === 'GREETING') {
      context = this.createNewContext();
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const reply = await this.responseService.getVariedResponse('GREETING', {
        businessName: tenant?.name || 'our business',
      }, tenantId);
      context.intent = intent;
      this.contexts.set(convId, context);
      await this.saveMessage(convId, 'assistant', reply, intent, entities);
      return { reply, intent, entities, conversationId: convId, quickReplies: ['Book a service', 'Check my booking', 'See prices'] };
    }

    if (['BOOKING_CREATE', 'BOOKING_CANCEL', 'BOOKING_RESCHEDULE', 'BOOKING_STATUS', 'PAYMENT_INQUIRY', 'PRICE_INQUIRY'].includes(intent)) {
      if (context.intent !== intent) {
        context = this.createNewContext();
        context.intent = intent;
      }

      entities = this.engine.mergeEntities(context.entities, entities);
      context.entities = entities;

      if (intent !== context.intent) {
        context.intent = intent;
      }

      const missingFields = this.engine.getMissingFields(intent, entities);

      if (missingFields.length > 0) {
        const nextField = missingFields[0];
        context.missingFields = missingFields;
        context.step += 1;

        const fieldPrompts: Record<string, string> = {
          service: 'ASK_SERVICE',
          date: 'ASK_DATE',
          time: 'ASK_TIME',
          name: 'ASK_NAME',
          phone: 'ASK_PHONE',
          bookingId: 'BOOKING_CANCEL',
        };

        let promptKey = fieldPrompts[nextField] || 'FALLBACK';

        if (nextField === 'date' && entities.service) {
          const reply = await this.responseService.getVariedResponse('BOOKING_CREATE', { service: entities.service }, tenantId);
          this.contexts.set(convId, context);
          await this.saveMessage(convId, 'assistant', reply, intent, entities);
          return { reply, intent, entities, conversationId: convId };
        }

        if (nextField === 'time' && entities.date) {
          const reply = await this.responseService.getResponse('BOOKING_CREATE_TIME', { date: entities.date }, tenantId);
          this.contexts.set(convId, context);
          await this.saveMessage(convId, 'assistant', reply, intent, entities);
          return { reply, intent, entities, conversationId: convId };
        }

        if (nextField === 'name' && entities.date && entities.time) {
          const reply = await this.responseService.getResponse('BOOKING_CREATE_NAME', {}, tenantId);
          this.contexts.set(convId, context);
          await this.saveMessage(convId, 'assistant', reply, intent, entities);
          return { reply, intent, entities, conversationId: convId };
        }

        if (nextField === 'phone' && entities.name) {
          const reply = await this.responseService.getResponse('BOOKING_CREATE_PHONE', { name: entities.name }, tenantId);
          this.contexts.set(convId, context);
          await this.saveMessage(convId, 'assistant', reply, intent, entities);
          return { reply, intent, entities, conversationId: convId };
        }

        const reply = await this.responseService.getResponse(promptKey, entities as Record<string, string>, tenantId);
        this.contexts.set(convId, context);
        await this.saveMessage(convId, 'assistant', reply, intent, entities);
        return { reply, intent, entities, conversationId: convId };
      }

      if (intent === 'BOOKING_CREATE') {
        context.step = 99;
        const vars: Record<string, string> = {};
        if (entities.service) vars.service = entities.service;
        if (entities.date) vars.date = entities.date;
        if (entities.time) vars.time = entities.time;
        if (entities.name) vars.name = entities.name;
        const reply = await this.responseService.getResponse('CONFIRM_BOOKING', vars, tenantId);
        this.contexts.set(convId, context);
        await this.saveMessage(convId, 'assistant', reply, intent, entities);
        return { reply, intent, entities, conversationId: convId, quickReplies: ['Yes', 'No'] };
      }

      const result = await this.taskExecutor.executeTask(intent, entities, context, tenantId);

      if (result.missingFields && result.missingFields.length > 0) {
        const nextField = result.missingFields[0];
        context.missingFields = result.missingFields;
        context.step += 1;

        const fieldPrompts: Record<string, string> = {
          bookingId: 'BOOKING_CANCEL',
          phone: 'BOOKING_STATUS',
          service: 'ASK_SERVICE',
          date: 'ASK_DATE',
        };

        const promptKey = fieldPrompts[nextField] || 'FALLBACK';
        const reply = await this.responseService.getResponse(promptKey, entities as Record<string, string>, tenantId);
        this.contexts.set(convId, context);
        await this.saveMessage(convId, 'assistant', reply, intent, entities);
        return { reply, intent, entities, conversationId: convId };
      }

      const reply = await this.buildResultResponse(intent, result, entities, tenantId);
      context = this.createNewContext();
      this.contexts.set(convId, context);
      await this.saveMessage(convId, 'assistant', reply, intent, entities);
      return { reply, intent, entities, conversationId: convId };
    }

    context = this.createNewContext();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const reply = await this.responseService.getVariedResponse('FALLBACK', { businessName: tenant?.name || 'our business' }, tenantId);
    this.contexts.set(convId, context);
    await this.saveMessage(convId, 'assistant', reply, 'FALLBACK', entities);
    return { reply, intent: 'FALLBACK', entities, conversationId: convId, quickReplies: ['Book a service', 'Check my booking', 'See prices'] };
  }

  async getConversations(tenantId: string) {
    return this.prisma.aiConversation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async getConversationMessages(conversationId: string) {
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSettings(tenantId: string) {
    const [tenant, responses] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { aiSettings: true },
      }),
      this.prisma.aiResponse.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const aiSettings = (tenant?.aiSettings as Record<string, any>) || {};
    return {
      greeting: aiSettings.greeting || '',
      fallbackMessage: aiSettings.fallbackMessage || '',
      businessHours: aiSettings.businessHours || null,
      languages: aiSettings.languages || ['en'],
      responses,
    };
  }

  async updateSettings(tenantId: string, settings: any) {
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiSettings: true },
    });
    const current = (existing?.aiSettings as Record<string, any>) || {};
    const merged = { ...current, ...settings };
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { aiSettings: merged },
    });
    return { success: true };
  }

  async createCustomResponse(tenantId: string, trigger: string, response: string, language: string = 'en') {
    return this.prisma.aiResponse.create({
      data: { tenantId, trigger, response, language },
    });
  }

  private async loadOrCreateConversation(tenantId: string, conversationId?: string) {
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findUnique({
        where: { id: conversationId },
      });
      if (existing && existing.tenantId === tenantId) {
        return existing;
      }
    }
    return this.prisma.aiConversation.create({
      data: { tenantId, sessionId: `session_${Date.now()}`, status: 'ACTIVE' },
    });
  }

  private async saveMessage(
    conversationId: string,
    role: string,
    content: string,
    intent?: string,
    entities?: EntityMap,
  ) {
    await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        intent: intent || null,
        entities: entities ? JSON.parse(JSON.stringify(entities)) : null,
      },
    });
  }

  private createNewContext(): ConversationState {
    return {
      intent: '',
      entities: {},
      missingFields: [],
      step: 0,
    };
  }

  private async buildResultResponse(
    intent: string,
    result: any,
    entities: EntityMap,
    tenantId: string,
  ): Promise<string> {
    if (!result.success) {
      return result.message;
    }

    switch (intent) {
      case 'BOOKING_CANCEL':
        return this.responseService.getResponse('BOOKING_CANCELLED', {
          bookingId: result.data.bookingId.slice(0, 8).toUpperCase(),
        }, tenantId);

      case 'BOOKING_RESCHEDULE':
        return this.responseService.getResponse('BOOKING_RESCHEDULED', {
          bookingId: result.data.bookingId.slice(0, 8).toUpperCase(),
          date: result.data.date,
          time: result.data.time,
        }, tenantId);

      case 'BOOKING_STATUS':
        return this.responseService.getResponse('BOOKING_STATUS_RESULT', {
          bookingId: result.data.bookingId.slice(0, 8).toUpperCase(),
          service: result.data.service,
          date: result.data.date,
          time: result.data.time,
          status: result.data.status,
        }, tenantId);

      case 'PAYMENT_INQUIRY':
        if (result.data?.noInvoices) {
          return this.responseService.getResponse('PAYMENT_NONE', {}, tenantId);
        }
        if (result.data?.invoices && result.data.invoices.length > 0) {
          const inv = result.data.invoices[0];
          return this.responseService.getResponse('PAYMENT_RESULT', {
            invoiceNumber: inv.invoiceNumber,
            amount: inv.amount.toString(),
            paymentLink: '#',
          }, tenantId);
        }
        return this.responseService.getResponse('PAYMENT_NONE', {}, tenantId);

      case 'PRICE_INQUIRY':
        if (result.data?.serviceNotFound) {
          return this.responseService.getResponse('PRICE_NOT_FOUND', {
            service: result.data.serviceName,
          }, tenantId);
        }
        return this.responseService.getResponse('PRICE_INQUIRY', {
          service: result.data.service,
          price: `${result.data.currency} ${result.data.price}`,
        }, tenantId);

      default:
        return result.message;
    }
  }
}
