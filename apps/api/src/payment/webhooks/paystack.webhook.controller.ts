import { Controller, Post, Headers, Body, Logger, HttpException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { PaymentService } from '../payment.service';

@ApiTags('Paystack Webhook')
@SkipThrottle()
@Controller('payments/webhooks/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
    private paymentService: PaymentService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Paystack webhook handler', description: 'Handle incoming Paystack payment webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    if (!signature) {
      throw new HttpException('Missing signature', 401);
    }

    const event = payload?.event;
    const data = payload?.data;
    if (!event || !data) {
      throw new HttpException('Invalid payload', 400);
    }

    const tenantId = data?.metadata?.tenantId;
    const reference = data.reference || data.id?.toString();

    // Look up the payment to find the tenant context (handles platform payments too)
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference },
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
      webhookSecret = platformSettings?.paystackWebhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET;
    } else {
      const settings = await this.prisma.paymentSettings.findUnique({
        where: { tenantId_provider: { tenantId: resolvedTenantId, provider: 'PAYSTACK' } },
      });
      webhookSecret = settings?.webhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET;
    }

    if (!webhookSecret) {
      this.logger.warn('No webhook secret configured for tenant');
      throw new HttpException('Webhook not configured', 401);
    }

    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid webhook signature');
      throw new HttpException('Invalid signature', 401);
    }

    switch (event) {
      case 'charge.success': {
        await this.handleChargeSuccess(data, resolvedTenantId, reference);
        break;
      }
      case 'charge.failed': {
        await this.handleChargeFailed(data, resolvedTenantId, reference);
        break;
      }
      default: {
        this.logger.log(`Unhandled Paystack event: ${event}`);
      }
    }

    return { success: true };
  }

  private async handleChargeSuccess(data: any, tenantId: string, reference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference },
      include: { subscriptionInvoice: true },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${reference}`);
      return;
    }
    if (payment.status === 'SUCCESS') return;

    // Subscription platform payment (paid to the platform's account)
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
        reference,
      });
      this.logger.log(`Subscription payment ${reference} completed successfully`);
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
            data: { status: 'COMPLETED', providerRef: reference, balanceAfter: credit.balance, creditId: credit.id },
          }),
        ]);
        this.webhookService.dispatchEvent(creditTx.tenantId, 'sms-credits.purchased', { transactionId: creditTx.id, reference });
        this.logger.log(`SMS credit purchase ${reference} completed successfully`);
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
      this.webhookService.dispatchEvent(tenantId, 'payment.completed', { paymentId: payment.id, invoiceId: payment.invoiceId!, reference });
      this.logger.log(`Payment ${reference} completed successfully`);
      return;
    }

    this.logger.warn(`Payment ${reference} has no linked invoice`);
  }

  private async handleChargeFailed(data: any, tenantId: string, reference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference },
      include: { subscriptionInvoice: true },
    });
    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: data },
    });

    if (payment.subscriptionInvoiceId) {
      const subTenantId = payment.subscriptionInvoice?.tenantId || tenantId;
      this.webhookService.dispatchEvent(subTenantId, 'subscription.payment.failed', { paymentId: payment.id, subscriptionInvoiceId: payment.subscriptionInvoiceId, reference });
    } else {
      this.webhookService.dispatchEvent(tenantId, 'payment.failed', { paymentId: payment.id, invoiceId: payment.invoiceId, reference });
    }
    this.logger.warn(`Payment ${reference} failed: ${data.gateway_response}`);
  }
}
