import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { MarketingCronService } from './marketing-cron.service';
import { EmailService } from '../notification/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingCronService, EmailService],
  exports: [MarketingService],
})
export class MarketingModule {}
