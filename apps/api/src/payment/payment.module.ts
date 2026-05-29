import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from '../webhook/webhook.module';
import { PaystackService } from './providers/paystack.service';
import { FlutterwaveService } from './providers/flutterwave.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaystackWebhookController } from './webhooks/paystack.webhook.controller';
import { FlutterwaveWebhookController } from './webhooks/flutterwave.webhook.controller';

@Module({
  imports: [ConfigModule, WebhookModule],
  controllers: [
    PaymentController,
    PaymentSettingsController,
    PaystackWebhookController,
    FlutterwaveWebhookController,
  ],
  providers: [
    PaystackService,
    FlutterwaveService,
    PaymentService,
  ],
  exports: [PaymentService, PaystackService, FlutterwaveService],
})
export class PaymentModule {}
