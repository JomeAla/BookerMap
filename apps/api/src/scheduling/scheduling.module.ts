import { Module } from '@nestjs/common';
import { DriveTimeService } from './drive-time.service';
import { SchedulingController } from './scheduling.controller';

@Module({
  controllers: [SchedulingController],
  providers: [DriveTimeService],
})
export class SchedulingModule {}