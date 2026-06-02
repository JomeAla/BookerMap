import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketingModule } from '../marketing/marketing.module';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { ReminderCronService } from './reminder-cron.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), MarketingModule, GatewayModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService, WhatsAppService, ReminderCronService],
  exports: [NotificationService, EmailService, SmsService, WhatsAppService],
})
export class NotificationModule {}
