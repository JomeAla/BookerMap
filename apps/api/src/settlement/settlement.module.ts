import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { SettlementReconciliationService } from './settlement-reconciliation.service';
import { SettlementCronService } from './settlement-cron.service';

@Module({
  imports: [PaymentModule],
  controllers: [SettlementController],
  providers: [SettlementService, SettlementReconciliationService, SettlementCronService],
  exports: [SettlementService, SettlementReconciliationService],
})
export class SettlementModule {}
