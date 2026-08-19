import { Controller, Post, Headers, Body, Logger, HttpException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { PaymentService } from '../payment.service';

@ApiTags('Flutterwave Webhook')
@SkipThrottle()
@Controller('payments/webhooks/flutterwave')
export class FlutterwaveWebhookController {
  private readonly logger = new Logger(FlutterwaveWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
    private paymentService: PaymentService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Flutterwave webhook handler', description: 'Handle incoming Flutterwave payment webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Headers('verif-hash') verifHash: string,
    @Body() payload: any,
  ) {
    if (!verifHash) {
      throw new HttpException('Missing verification hash', 401);
    }

    const event = payload?.event;
    const data = payload?.data;
    if (!event || !data) {
      throw new HttpException('Invalid payload', 400);
    }

    const tenantId = data?.meta?.tenantId || data?.tenantId;
    const txRef = data.tx_ref || data.id?.toString();

    // Look up the payment to find the tenant context (handles platform payments too)
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: txRef },
      include: { subscriptionInvoice: true, invoice: true },
    });
    const resolvedTenantId = tenantId || payment?.invoice?.tenantId || payment?.subscriptionInvoice?.tenantId;

    if (!resolvedTenantId) {
      this.logger.warn('Webhook received without tenantId in metadata');
      throw new HttpException('Tenant context missing', 400);
    }

    let webhookSecret: string | undefined;
    if (payment?.subscriptionInvoiceId) {
      const platformSettings = await this.prisma.platformPaymentSettings.findFirst();
      webhookSecret = platformSettings?.flutterwaveWebhookSecret || process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    } else {
      const settings = await this.prisma.paymentSettings.findUnique({
        where: { tenantId_provider: { tenantId: resolvedTenantId, provider: 'FLUTTERWAVE' } },
      });
      webhookSecret = settings?.webhookSecret || process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    }

    if (webhookSecret) {
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (expectedHash !== verifHash && verifHash !== webhookSecret) {
        this.logger.warn('Invalid Flutterwave webhook signature');
        throw new HttpException('Invalid signature', 401);
      }
    }

    switch (event) {
      case 'charge.completed': {
        await this.handleChargeCompleted(data, resolvedTenantId, txRef);
        break;
      }
      case 'charge.failed': {
        await this.handleChargeFailed(data, resolvedTenantId, txRef);
        break;
      }
      case 'transfer.completed': {
        await this.handleTransferCompleted(data, resolvedTenantId);
        break;
      }
      default: {
        this.logger.log(`Unhandled Flutterwave event: ${event}`);
      }
    }

    return { success: true };
  }

  private async handleChargeCompleted(data: any, tenantId: string, txRef: string) {
    if (data.status !== 'successful') {
      await this.handleChargeFailed(data, tenantId, txRef);
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: txRef },
      include: { subscriptionInvoice: true },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for tx_ref: ${txRef}`);
      return;
    }
    if (payment.status === 'SUCCESS') return;

    // Subscription platform payment
    if (payment.subscriptionInvoiceId) {
      const subTenantId = payment.subscriptionInvoice?.tenantId || tenantId;
      await this.paymentService.handleSubscriptionPaymentSuccess(
        payment.id,
        payment.subscriptionInvoiceId,
        subTenantId,
        data,
      );
      this.webhookService.dispatchEvent(subTenantId, 'subscription.paid', {
        paymentId: payment.id,
        subscriptionInvoiceId: payment.subscriptionInvoiceId,
        txRef,
      });
      this.logger.log(`Flutterwave subscription payment ${txRef} completed successfully`);
      return;
    }

    // SMS credit purchase (paid to the platform's account)
    const creditTxId = (payment.providerData as any)?.smsCreditTransactionId;
    if (creditTxId) {
      const creditTx = await this.prisma.smsCreditTransaction.findUnique({ where: { id: creditTxId } });
      if (creditTx && creditTx.status !== 'COMPLETED') {
        const credit = await this.prisma.smsCredit.upsert({
          where: { tenantId: creditTx.tenantId },
          create: { tenantId: creditTx.tenantId, balance: creditTx.amount, totalPurchased: creditTx.amount, totalUsed: 0 },
          update: { balance: { increment: creditTx.amount }, totalPurchased: { increment: creditTx.amount } },
        });
        await this.prisma.$transaction([
          this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS', providerData: data } }),
          this.prisma.smsCreditTransaction.update({
            where: { id: creditTx.id },
            data: { status: 'COMPLETED', providerRef: txRef, balanceAfter: credit.balance, creditId: credit.id },
          }),
        ]);
        this.webhookService.dispatchEvent(creditTx.tenantId, 'sms-credits.purchased', { transactionId: creditTx.id, txRef });
        this.logger.log(`Flutterwave SMS credit purchase ${txRef} completed successfully`);
      }
      return;
    }

    // Tenant invoice payment
    if (payment.invoiceId) {
      await this.paymentService.handlePaymentSuccess(
        payment.id,
        payment.invoiceId,
        tenantId,
        data,
      );
      this.webhookService.dispatchEvent(tenantId, 'payment.completed', { paymentId: payment.id, invoiceId: payment.invoiceId, txRef });
      this.logger.log(`Flutterwave charge ${txRef} completed successfully`);
      return;
    }

    this.logger.warn(`Flutterwave payment ${txRef} has no linked invoice`);
  }

  private async handleChargeFailed(data: any, tenantId: string, txRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: txRef },
      include: { subscriptionInvoice: true },
    });
    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: data },
    });

    if (payment.subscriptionInvoiceId) {
      const subTenantId = payment.subscriptionInvoice?.tenantId || tenantId;
      this.webhookService.dispatchEvent(subTenantId, 'subscription.payment.failed', { paymentId: payment.id, subscriptionInvoiceId: payment.subscriptionInvoiceId, txRef });
    } else {
      this.webhookService.dispatchEvent(tenantId, 'payment.failed', { paymentId: payment.id, invoiceId: payment.invoiceId, txRef });
    }
    this.logger.warn(`Flutterwave charge ${txRef} failed: ${data.processor_response}`);
  }

  private async handleTransferCompleted(data: any, tenantId: string) {
    this.logger.log(`Transfer ${data.id} completed for tenant ${tenantId}`);
  }
}
