import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RoutingService } from '../routing/routing.service';
import { DriveTimeService } from './drive-time.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Scheduling')
@ApiBearerAuth()
@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  private readonly logger = new Logger(SchedulingController.name);

  constructor(
    private readonly routingService: RoutingService,
    private readonly driveTimeService: DriveTimeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('drive-time')
  @ApiOperation({ summary: 'Calculate drive time', description: 'Calculate estimated drive time between two addresses' })
  @ApiResponse({ status: 200, description: 'Drive time in minutes' })
  async calculateDriveTime(
    @Body() body: { originAddressId?: string; destinationAddressId?: string; origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number } },
    @TenantId() tenantId: string,
  ) {
    let origin: { lat: number; lng: number } | null = null;
    let destination: { lat: number; lng: number } | null = null;

    if (body.origin && body.destination) {
      origin = body.origin;
      destination = body.destination;
    } else if (body.originAddressId && body.destinationAddressId) {
      const addresses = await this.prisma.customerAddress.findMany({
        where: { id: { in: [body.originAddressId, body.destinationAddressId] } },
      });
      const origAddr = addresses.find((a) => a.id === body.originAddressId);
      const destAddr = addresses.find((a) => a.id === body.destinationAddressId);
      if (origAddr?.latitude != null && origAddr?.longitude != null) {
        origin = { lat: origAddr.latitude, lng: origAddr.longitude };
      }
      if (destAddr?.latitude != null && destAddr?.longitude != null) {
        destination = { lat: destAddr.latitude, lng: destAddr.longitude };
      }
    }

    if (!origin || !destination) {
      return { travelTimeMinutes: 0, distanceKm: 0, source: 'unavailable' };
    }

    try {
      const durationSeconds = await this.routingService.getDriveTime(origin, destination);
      if (durationSeconds > 0) {
        const travelTimeMinutes = Math.ceil(durationSeconds / 60);
        return { travelTimeMinutes, distanceKm: 0, source: 'osrm' };
      }
    } catch (error: any) {
      this.logger.warn(`OSRM drive time failed, falling back to haversine: ${error.message}`);
    }

    const travelTimeMinutes = await this.driveTimeService.calculateTravelTime(origin, destination);
    return { travelTimeMinutes, distanceKm: 0, source: 'haversine' };
  }
}