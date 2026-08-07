import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from '../webhook/webhook.module';
import { PaystackService } from './providers/paystack.service';
import { FlutterwaveService } from './providers/flutterwave.service';
import { PaymentService } from './payment.service';
import { CardService } from './card.service';
import { RecurringPaymentService } from './recurring-payment.service';
import { PaymentController } from './payment.controller';
import { PaymentSettingsController } from './payment-settings.controller';
import { RecurringPaymentController } from './recurring-payment.controller';
import { PaystackWebhookController } from './webhooks/paystack.webhook.controller';
import { FlutterwaveWebhookController } from './webhooks/flutterwave.webhook.controller';

@Module({
  imports: [ConfigModule, forwardRef(() => WebhookModule)],
  controllers: [
    PaymentController,
    PaymentSettingsController,
    RecurringPaymentController,
    PaystackWebhookController,
    FlutterwaveWebhookController,
  ],
  providers: [
    PaystackService,
    FlutterwaveService,
    PaymentService,
    CardService,
    RecurringPaymentService,
  ],
  exports: [PaymentService, PaystackService, FlutterwaveService, CardService, RecurringPaymentService],
})
export class PaymentModule {}
