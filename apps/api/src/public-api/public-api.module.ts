import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiThrottleGuard } from './guards/api-throttle.guard';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [BookingModule, CustomerModule, ServiceModule],
  controllers: [PublicApiController, ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard, ApiThrottleGuard],
  exports: [ApiKeyService],
})
export class PublicApiModule {}
