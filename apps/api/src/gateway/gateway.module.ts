import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BookingGateway } from './booking.gateway';
import { LocationGateway } from './location.gateway';
import { LocationWsGuard } from './location.guard';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    LocationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  providers: [LocationWsGuard, BookingGateway, LocationGateway],
  exports: [BookingGateway, LocationGateway],
})
export class GatewayModule {}
