import { Module, forwardRef } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';

@Module({
  imports: [forwardRef(() => WebhookModule), PaymentModule, NotificationModule],
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
