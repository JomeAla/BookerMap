import { Module } from '@nestjs/common';
import { SplitPaymentController } from './split-payment.controller';
import { SplitPaymentService } from './split-payment.service';

@Module({
  controllers: [SplitPaymentController],
  providers: [SplitPaymentService],
  exports: [SplitPaymentService],
})
export class SplitPaymentModule {}
