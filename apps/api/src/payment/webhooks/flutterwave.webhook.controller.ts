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
    if (!tenantId) {
      this.logger.warn('Webhook received without tenantId in metadata');
      throw new HttpException('Tenant context missing', 400);
    }

    const settings = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'FLUTTERWAVE' } },
    });

    const webhookSecret = settings?.webhookSecret || process.env.FLUTTERWAVE_WEBHOOK_SECRET;
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

    const txRef = data.tx_ref || data.id?.toString();

    switch (event) {
      case 'charge.completed': {
        await this.handleChargeCompleted(data, tenantId, txRef);
        break;
      }
      case 'charge.failed': {
        await this.handleChargeFailed(data, tenantId, txRef);
        break;
      }
      case 'transfer.completed': {
        await this.handleTransferCompleted(data, tenantId);
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
      where: { providerRef: txRef, invoice: { tenantId } },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for tx_ref: ${txRef}`);
      return;
    }
    if (payment.status === 'SUCCESS') return;

    await this.paymentService.handlePaymentSuccess(
      payment.id,
      payment.invoiceId,
      tenantId,
      data,
    );

    this.webhookService.dispatchEvent(tenantId, 'payment.completed', { paymentId: payment.id, invoiceId: payment.invoiceId, txRef });
    this.logger.log(`Flutterwave charge ${txRef} completed successfully`);
  }

  private async handleChargeFailed(data: any, tenantId: string, txRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: txRef, invoice: { tenantId } },
    });
    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: data },
    });

    this.webhookService.dispatchEvent(tenantId, 'payment.failed', { paymentId: payment.id, invoiceId: payment.invoiceId, txRef });
    this.logger.warn(`Flutterwave charge ${txRef} failed: ${data.processor_response}`);
  }

  private async handleTransferCompleted(data: any, tenantId: string) {
    this.logger.log(`Transfer ${data.id} completed for tenant ${tenantId}`);
  }
}
