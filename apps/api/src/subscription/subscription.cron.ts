import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Bill renewals for paid ACTIVE subscriptions whose billing period has ended
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleRenewals() {
    this.logger.log('Running subscription renewal cron...');
    const result = await this.subscriptionService.processRenewals();
    this.logger.log(`Renewal cron complete: ${JSON.stringify(result)}`);
  }

  // Flag severely past-due subscriptions, then expirations handled separately
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async handleExpirations() {
    this.logger.log('Running subscription expiration cron...');
    await this.subscriptionService.checkExpirations();
  }
}