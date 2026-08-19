import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAdminBootstrap } from './platform-admin.bootstrap';
import { PlatformPaymentSettingsService } from './platform-payment-settings.service';
import { PlatformPaymentSettingsController } from './platform-payment-settings.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PlatformPaymentSettingsController],
  providers: [PlatformAdminBootstrap, PlatformPaymentSettingsService],
  exports: [PlatformAdminBootstrap, PlatformPaymentSettingsService],
})
export class PlatformAdminModule {}