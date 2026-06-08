import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementReconciliationService } from './settlement-reconciliation.service';

@Injectable()
export class SettlementCronService {
  private readonly logger = new Logger(SettlementCronService.name);

  constructor(
    private prisma: PrismaService,
    private reconciliationService: SettlementReconciliationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyReconciliation() {
    this.logger.log('Starting daily settlement reconciliation for all active tenants');

    const activeTenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const tenant of activeTenants) {
      try {
        const results = await this.reconciliationService.reconcileAll(tenant.id);
        const paystackSummary = results.paystack
          ? `${results.paystack.matched} matched, ${results.paystack.autoCreated} auto-created`
          : 'skipped';
        const flutterwaveSummary = results.flutterwave
          ? `${results.flutterwave.matched} matched, ${results.flutterwave.autoCreated} auto-created`
          : 'skipped';
        this.logger.log(`Tenant "${tenant.name}" (${tenant.id}): Paystack=${paystackSummary}, Flutterwave=${flutterwaveSummary}`);
      } catch (err) {
        this.logger.error(
          `Reconciliation failed for tenant "${tenant.name}" (${tenant.id}): ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('Daily settlement reconciliation complete');
  }
}
