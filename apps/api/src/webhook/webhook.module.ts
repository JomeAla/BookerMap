import { Module, forwardRef } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookActionService } from './webhook-action.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookRetryCron } from './webhook-retry.cron';

@Module({
  imports: [
    forwardRef(() => BookingModule),
    forwardRef(() => AiAgentModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookActionService, WebhookDeliveryService, WebhookRetryCron],
  exports: [WebhookService, WebhookActionService, WebhookDeliveryService],
})
export class WebhookModule {}
