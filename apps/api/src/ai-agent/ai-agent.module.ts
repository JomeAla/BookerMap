import { Module, forwardRef } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { AiAgentController } from './ai-agent.controller';
import { FlowController } from './flow.controller';
import { ConversationEngine } from './services/conversation.engine';
import { ResponseService } from './services/response.service';
import { TaskExecutor } from './services/task-executor.service';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';
import { EscalationService } from './services/escalation.service';
import { PaymentHandler } from './handlers/payment.handler';
import { FlowService } from './services/flow.service';

@Module({
  imports: [forwardRef(() => BookingModule), CustomerModule, InvoiceModule, NotificationModule, PaymentModule],
  controllers: [AiAgentController, FlowController],
  providers: [
    ConversationEngine,
    ResponseService,
    TaskExecutor,
    ChatService,
    AnalyticsService,
    EscalationService,
    PaymentHandler,
    FlowService,
  ],
  exports: [ChatService, AnalyticsService, EscalationService, PaymentHandler, FlowService],
})
export class AiAgentModule {}
