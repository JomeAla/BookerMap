import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketingService } from './marketing.service';

@Injectable()
export class MarketingCronService {
  private readonly logger = new Logger(MarketingCronService.name);

  constructor(private readonly marketingService: MarketingService) {}

  @Cron('0 9 * * *')
  async handleDailyCampaignRun() {
    this.logger.log('Starting daily campaign auto-run (9:00 AM)...');
    try {
      const results = await this.marketingService.processAllActiveCampaigns();
      const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
      const totalEligible = results.reduce((sum, r) => sum + r.total, 0);
      this.logger.log(
        `Daily campaign run complete: ${results.length} active campaigns processed, ` +
        `${totalSent} emails sent out of ${totalEligible} eligible customers`,
      );
      for (const r of results) {
        this.logger.log(`  - "${r.name}" (${r.campaignId}): sent ${r.sent}/${r.total}`);
      }
    } catch (error) {
      this.logger.error(
        `Daily campaign run failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
