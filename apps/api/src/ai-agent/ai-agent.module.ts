import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { AiAgentController } from './ai-agent.controller';
import { ConversationEngine } from './services/conversation.engine';
import { ResponseService } from './services/response.service';
import { TaskExecutor } from './services/task-executor.service';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [BookingModule, CustomerModule, InvoiceModule],
  controllers: [AiAgentController],
  providers: [
    ConversationEngine,
    ResponseService,
    TaskExecutor,
    ChatService,
    AnalyticsService,
  ],
  exports: [ChatService, AnalyticsService],
})
export class AiAgentModule {}
