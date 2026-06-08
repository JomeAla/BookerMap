import { Module } from '@nestjs/common';
import { DriveTimeService } from './drive-time.service';
import { SchedulingController } from './scheduling.controller';
import { RoutingModule } from '../routing/routing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [RoutingModule, PrismaModule],
  controllers: [SchedulingController],
  providers: [DriveTimeService],
})
export class SchedulingModule {}