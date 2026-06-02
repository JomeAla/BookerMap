import { Module, forwardRef } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { PricingModule } from '../pricing/pricing.module';
import { SplitPaymentModule } from '../split-payment/split-payment.module';
import { SatisfactionModule } from '../satisfaction/satisfaction.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GatewayModule } from '../gateway/gateway.module';
import { BookingService } from './booking.service';
import { SchedulingService } from './scheduling.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [forwardRef(() => WebhookModule), PricingModule, SplitPaymentModule, SatisfactionModule, DispatchModule, GatewayModule],
  controllers: [BookingController],
  providers: [BookingService, SchedulingService],
  exports: [BookingService, SchedulingService],
})
export class BookingModule {}
