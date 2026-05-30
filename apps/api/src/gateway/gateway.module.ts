import { Module } from '@nestjs/common';
import { BookingGateway } from './booking.gateway';

@Module({
  providers: [BookingGateway],
  exports: [BookingGateway],
})
export class GatewayModule {}
