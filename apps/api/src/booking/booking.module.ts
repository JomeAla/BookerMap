import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { PricingModule } from '../pricing/pricing.module';
import { SplitPaymentModule } from '../split-payment/split-payment.module';
import { BookingService } from './booking.service';
import { SchedulingService } from './scheduling.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [WebhookModule, PricingModule, SplitPaymentModule],
  controllers: [BookingController],
  providers: [BookingService, SchedulingService],
  exports: [BookingService, SchedulingService],
})
export class BookingModule {}
