import { Controller, Post, Body } from '@nestjs/common';
import { DriveTimeService } from './drive-time.service';

@Controller('scheduling')
export class SchedulingController {
  constructor(private driveTimeService: DriveTimeService) {}

  @Post('drive-time')
  async calculateDriveTime(@Body() body: { originAddressId: string; destinationAddressId: string }) {
    // In a real implementation, we would fetch the addresses from the database using the IDs
    // For now, we'll return a placeholder
    // TODO: Implement actual address lookup and travel time calculation
    return { travelTimeMinutes: 15 };
  }
}