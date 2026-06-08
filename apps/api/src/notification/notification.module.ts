import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketingModule } from '../marketing/marketing.module';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificationController } from './notification.controller';
import { BulkSmsController } from './bulk-sms.controller';
import { NotificationService } from './notification.service';
import { WebPushService } from './web-push.service';
import { MobilePushService } from './mobile-push.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { SmsCreditService } from './sms-credit.service';
import { PlatformSmsSettingsService } from './platform-sms-settings.service';
import { ReminderCronService } from './reminder-cron.service';
import { BulkSmsService } from './bulk-sms.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), MarketingModule, GatewayModule],
  controllers: [NotificationController, BulkSmsController],
  providers: [
    NotificationService,
    WebPushService,
    MobilePushService,
    EmailService,
    SmsService,
    WhatsAppService,
    SmsCreditService,
    PlatformSmsSettingsService,
    ReminderCronService,
    BulkSmsService,
  ],
  exports: [NotificationService, WebPushService, MobilePushService, EmailService, SmsService, WhatsAppService, SmsCreditService, PlatformSmsSettingsService, BulkSmsService],
})
export class NotificationModule {}