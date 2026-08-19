import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketingModule } from '../marketing/marketing.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationController } from './notification.controller';
import { BulkSmsController } from './bulk-sms.controller';
import { SmsTemplateController } from './sms-template.controller';
import { WhatsAppTemplateController } from './whatsapp-template.controller';
import { NotificationService } from './notification.service';
import { WebPushService } from './web-push.service';
import { MobilePushService } from './mobile-push.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { SmsTemplateService } from './sms-template.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { SmsCreditService } from './sms-credit.service';
import { PlatformSmsSettingsService } from './platform-sms-settings.service';
import { ReminderCronService } from './reminder-cron.service';
import { BulkSmsService } from './bulk-sms.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), forwardRef(() => MarketingModule), forwardRef(() => GatewayModule), forwardRef(() => PaymentModule)],
  controllers: [NotificationController, BulkSmsController, SmsTemplateController, WhatsAppTemplateController],
  providers: [
    NotificationService,
    WebPushService,
    MobilePushService,
    EmailService,
    SmsService,
    SmsTemplateService,
    WhatsAppService,
    WhatsAppTemplateService,
    SmsCreditService,
    PlatformSmsSettingsService,
    ReminderCronService,
    BulkSmsService,
  ],
  exports: [NotificationService, WebPushService, MobilePushService, EmailService, SmsService, SmsTemplateService, WhatsAppService, WhatsAppTemplateService, SmsCreditService, PlatformSmsSettingsService, BulkSmsService],
})
export class NotificationModule {}