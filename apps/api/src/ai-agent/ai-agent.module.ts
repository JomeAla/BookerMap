import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { AiAgentController } from './ai-agent.controller';
import { ConversationEngine } from './services/conversation.engine';
import { ResponseService } from './services/response.service';
import { TaskExecutor } from './services/task-executor.service';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';
import { EscalationService } from './services/escalation.service';
import { PaymentHandler } from './handlers/payment.handler';

@Module({
  imports: [BookingModule, CustomerModule, InvoiceModule, NotificationModule, PaymentModule],
  controllers: [AiAgentController],
  providers: [
    ConversationEngine,
    ResponseService,
    TaskExecutor,
    ChatService,
    AnalyticsService,
    EscalationService,
    PaymentHandler,
  ],
  exports: [ChatService, AnalyticsService, EscalationService, PaymentHandler],
})
export class AiAgentModule {}
