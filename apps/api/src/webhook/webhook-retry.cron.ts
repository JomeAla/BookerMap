import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Injectable()
export class WebhookRetryCron {
  private readonly logger = new Logger(WebhookRetryCron.name);

  constructor(private deliveryService: WebhookDeliveryService) {}

  @Cron('0 */15 * * * *')
  async handleRetry() {
    this.logger.debug('Running webhook retry cron...');
    try {
      const result = await this.deliveryService.retryFailedDeliveries();
      this.logger.log(`Webhook retry cron completed: ${result.retried} deliveries retried`);
    } catch (error) {
      this.logger.error(`Webhook retry cron failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
