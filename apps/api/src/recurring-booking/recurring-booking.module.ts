import { Module } from '@nestjs/common';
import { RecurringBookingController } from './recurring-booking.controller';
import { RecurringBookingService } from './recurring-booking.service';
import { SchedulingService } from '../booking/scheduling.service';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [RecurringBookingController],
  providers: [RecurringBookingService],
})
export class RecurringBookingModule {}
