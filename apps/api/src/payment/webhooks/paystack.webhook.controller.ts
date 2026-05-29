import { Controller, Post, Headers, Body, Logger, HttpException, HttpCode } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

@Controller('payments/webhooks/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
  ) {}

  @Post()
  @HttpCode(200)
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
    if (!tenantId) {
      this.logger.warn('Webhook received without tenantId in metadata');
      throw new HttpException('Tenant context missing', 400);
    }

    const settings = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'PAYSTACK' } },
    });

    const webhookSecret = settings?.webhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET;
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

    const reference = data.reference || data.id?.toString();

    switch (event) {
      case 'charge.success': {
        await this.handleChargeSuccess(data, tenantId, reference);
        break;
      }
      case 'charge.failed': {
        await this.handleChargeFailed(data, tenantId, reference);
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
      where: { providerRef: reference, invoice: { tenantId } },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${reference}`);
      return;
    }
    if (payment.status === 'SUCCESS') return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        currency: data.currency || 'NGN',
        fee: data.fees ? data.fees / 100 : null,
        providerData: data,
      },
    });

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });

    this.webhookService.dispatchEvent(tenantId, 'payment.completed', { paymentId: payment.id, invoiceId: payment.invoiceId, reference });
    this.logger.log(`Payment ${reference} completed successfully`);
  }

  private async handleChargeFailed(data: any, tenantId: string, reference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference, invoice: { tenantId } },
    });
    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: data },
    });

    this.webhookService.dispatchEvent(tenantId, 'payment.failed', { paymentId: payment.id, invoiceId: payment.invoiceId, reference });
    this.logger.warn(`Payment ${reference} failed: ${data.gateway_response}`);
  }
}
