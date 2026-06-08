import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payment/providers/paystack.service';
import { FlutterwaveService } from '../payment/providers/flutterwave.service';
import { SettlementStatus } from '@prisma/client';

export interface ReconciliationResult {
  provider: string;
  matched: number;
  unmatched: number;
  autoCreated: number;
  totalProviderAmount: number;
  totalLocalAmount: number;
  difference: number;
  startDate: string;
  endDate: string;
  runAt: string;
}

@Injectable()
export class SettlementReconciliationService {
  private readonly logger = new Logger(SettlementReconciliationService.name);
  private lastResults = new Map<string, { paystack?: ReconciliationResult; flutterwave?: ReconciliationResult }>();
  private history = new Map<string, ReconciliationResult[]>();

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
  ) {}

  async reconcilePaystack(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReconciliationResult> {
    const to = endDate ? new Date(endDate) : new Date();
    const from = startDate ? new Date(startDate) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.logger.log(`Starting Paystack reconciliation for tenant ${tenantId} (${from.toISOString()} - ${to.toISOString()})`);

    const providerSettlements = await this.paystackService.listSettlements(tenantId, from, to);
    const providerItems = Array.isArray(providerSettlements) ? providerSettlements : [];

    const localSettlements = await this.prisma.settlement.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        lineItems: true,
      },
    });

    const totalProviderAmount = providerItems.reduce(
      (sum: number, s: any) => sum + ((s.total_amount || s.amount || 0) / 100),
      0,
    );
    const totalLocalAmount = localSettlements.reduce((sum, s) => sum + s.netAmount, 0);

    let matched = 0;
    let unmatched = 0;
    let autoCreated = 0;

    const localLineItems = localSettlements.flatMap((s) =>
      s.lineItems.map((li) => ({ ...li, settlementStatus: s.status })),
    );

    for (const providerItem of providerItems) {
      const providerAmount = (providerItem.total_amount || providerItem.amount || 0) / 100;
      const providerRef = (providerItem.id || providerItem.reference || '').toString();
      const providerDate = providerItem.settlement_date || providerItem.created_at || providerItem.paidDate;
      const providerStatus = (providerItem.status || '').toLowerCase();

      if (providerStatus === 'failed' || providerStatus === 'declined') {
        continue;
      }

      const matchedItem = localLineItems.find((li) => {
        return Math.abs(li.amount - providerAmount) < 0.5;
      });

      if (matchedItem) {
        matched++;
      } else {
        unmatched++;
        try {
          const settlementDate = providerDate ? new Date(providerDate) : new Date();
          await this.prisma.settlement.create({
            data: {
              tenantId,
              providerId: tenantId,
              periodStart: settlementDate,
              periodEnd: settlementDate,
              totalEarned: providerAmount,
              totalFee: 0,
              netAmount: providerAmount,
              status: SettlementStatus.COMPLETED,
              paidAt: settlementDate,
              paymentMethod: 'PAYSTACK',
              paymentReference: providerRef,
              notes: `Auto-created via Paystack reconciliation. Provider settlement ID: ${providerRef}`,
              lineItems: {
                create: [
                  {
                    amount: providerAmount,
                    description: `Paystack settlement ${providerRef} (${providerDate ? new Date(providerDate).toISOString().slice(0, 10) : 'N/A'})`,
                  },
                ],
              },
            },
          });
          autoCreated++;
        } catch (err) {
          this.logger.error(
            `Failed to auto-create settlement for Paystack ref ${providerRef}: ${(err as Error).message}`,
          );
        }
      }
    }

    const result: ReconciliationResult = {
      provider: 'PAYSTACK',
      matched,
      unmatched,
      autoCreated,
      totalProviderAmount: Math.round(totalProviderAmount * 100) / 100,
      totalLocalAmount: Math.round(totalLocalAmount * 100) / 100,
      difference: Math.round((totalProviderAmount - totalLocalAmount) * 100) / 100,
      startDate: from.toISOString().slice(0, 10),
      endDate: to.toISOString().slice(0, 10),
      runAt: new Date().toISOString(),
    };

    this.storeResult(tenantId, 'paystack', result);

    this.logger.log(
      `Paystack reconciliation complete: ${matched} matched, ${unmatched} unmatched, ${autoCreated} auto-created`,
    );
    return result;
  }

  async reconcileFlutterwave(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReconciliationResult> {
    const to = endDate ? new Date(endDate) : new Date();
    const from = startDate ? new Date(startDate) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.logger.log(`Starting Flutterwave reconciliation for tenant ${tenantId} (${from.toISOString()} - ${to.toISOString()})`);

    const providerSettlements = await this.flutterwaveService.listSettlements(tenantId, from, to);
    const providerItems = Array.isArray(providerSettlements) ? providerSettlements : [];

    const localSettlements = await this.prisma.settlement.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        lineItems: true,
      },
    });

    const totalProviderAmount = providerItems.reduce(
      (sum: number, s: any) => sum + (s.amount || 0),
      0,
    );
    const totalLocalAmount = localSettlements.reduce((sum, s) => sum + s.netAmount, 0);

    let matched = 0;
    let unmatched = 0;
    let autoCreated = 0;

    const localLineItems = localSettlements.flatMap((s) =>
      s.lineItems.map((li) => ({ ...li, settlementStatus: s.status })),
    );

    for (const providerItem of providerItems) {
      const providerAmount = providerItem.amount || 0;
      const providerRef = (providerItem.id || providerItem.tx_ref || providerItem.reference || '').toString();
      const providerDate = providerItem.created_at || providerItem.settlement_date;
      const providerStatus = (providerItem.status || '').toLowerCase();

      if (providerStatus === 'failed' || providerStatus === 'declined') {
        continue;
      }

      const matchedItem = localLineItems.find((li) => {
        return Math.abs(li.amount - providerAmount) < 0.5;
      });

      if (matchedItem) {
        matched++;
      } else {
        unmatched++;
        try {
          const settlementDate = providerDate ? new Date(providerDate) : new Date();
          await this.prisma.settlement.create({
            data: {
              tenantId,
              providerId: tenantId,
              periodStart: settlementDate,
              periodEnd: settlementDate,
              totalEarned: providerAmount,
              totalFee: 0,
              netAmount: providerAmount,
              status: SettlementStatus.COMPLETED,
              paidAt: settlementDate,
              paymentMethod: 'FLUTTERWAVE',
              paymentReference: providerRef,
              notes: `Auto-created via Flutterwave reconciliation. Provider settlement ID: ${providerRef}`,
              lineItems: {
                create: [
                  {
                    amount: providerAmount,
                    description: `Flutterwave settlement ${providerRef} (${providerDate ? new Date(providerDate).toISOString().slice(0, 10) : 'N/A'})`,
                  },
                ],
              },
            },
          });
          autoCreated++;
        } catch (err) {
          this.logger.error(
            `Failed to auto-create settlement for Flutterwave ref ${providerRef}: ${(err as Error).message}`,
          );
        }
      }
    }

    const result: ReconciliationResult = {
      provider: 'FLUTTERWAVE',
      matched,
      unmatched,
      autoCreated,
      totalProviderAmount: Math.round(totalProviderAmount * 100) / 100,
      totalLocalAmount: Math.round(totalLocalAmount * 100) / 100,
      difference: Math.round((totalProviderAmount - totalLocalAmount) * 100) / 100,
      startDate: from.toISOString().slice(0, 10),
      endDate: to.toISOString().slice(0, 10),
      runAt: new Date().toISOString(),
    };

    this.storeResult(tenantId, 'flutterwave', result);

    this.logger.log(
      `Flutterwave reconciliation complete: ${matched} matched, ${unmatched} unmatched, ${autoCreated} auto-created`,
    );
    return result;
  }

  async reconcileAll(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ paystack?: ReconciliationResult; flutterwave?: ReconciliationResult }> {
    const results: { paystack?: ReconciliationResult; flutterwave?: ReconciliationResult } = {};

    const paymentSettings = await this.prisma.paymentSettings.findMany({
      where: { tenantId, isActive: true },
    });

    for (const setting of paymentSettings) {
      try {
        if (setting.provider === 'PAYSTACK') {
          results.paystack = await this.reconcilePaystack(tenantId, startDate, endDate);
        } else if (setting.provider === 'FLUTTERWAVE') {
          results.flutterwave = await this.reconcileFlutterwave(tenantId, startDate, endDate);
        }
      } catch (err) {
        this.logger.error(
          `Reconciliation failed for ${setting.provider}: ${(err as Error).message}`,
        );
      }
    }

    return results;
  }

  private storeResult(tenantId: string, key: 'paystack' | 'flutterwave', result: ReconciliationResult) {
    const existing = this.lastResults.get(tenantId) || {};
    existing[key] = result;
    this.lastResults.set(tenantId, existing);

    const tenantHistory = this.history.get(tenantId) || [];
    tenantHistory.push(result);
    if (tenantHistory.length > 20) {
      tenantHistory.shift();
    }
    this.history.set(tenantId, tenantHistory);
  }

  getLastReconciliationReport(tenantId: string) {
    return this.lastResults.get(tenantId) || null;
  }

  getReconciliationHistory(tenantId: string): ReconciliationResult[] {
    return (this.history.get(tenantId) || [])
      .slice()
      .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
  }
}
