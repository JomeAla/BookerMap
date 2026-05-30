import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { ReminderCronService } from './reminder-cron.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService, ReminderCronService],
  exports: [NotificationService, EmailService, SmsService],
})
export class NotificationModule {}
