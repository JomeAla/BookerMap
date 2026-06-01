import { Module } from '@nestjs/common';
import { BookingGateway } from './booking.gateway';
import { LocationGateway } from './location.gateway';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [LocationModule],
  providers: [BookingGateway, LocationGateway],
  exports: [BookingGateway, LocationGateway],
})
export class GatewayModule {}
