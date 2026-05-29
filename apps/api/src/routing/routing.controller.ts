import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RoutingService } from './routing.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  private readonly logger = new Logger(RoutingController.name);

  constructor(
    private readonly routingService: RoutingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('optimize')
  async optimizeRoute(
    @Body() body: { dispatchIds: string[]; technicianId?: string },
    @TenantId() tenantId: string,
  ) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: { id: { in: body.dispatchIds }, booking: { tenantId } },
      include: {
        booking: {
          include: { customer: { include: { addresses: { take: 1 } } }, service: true },
        },
        assignedTo: true,
      },
    });

    const origin = body.technicianId
      ? await this.prisma.user.findFirst({
          where: { id: body.technicianId, tenantId },
          select: { latitude: true, longitude: true, firstName: true, lastName: true },
        })
      : null;

    const stops = dispatches.map((d) => {
      const addr = d.booking?.customer?.addresses?.[0];
      return {
        lat: addr?.latitude || 0,
        lng: addr?.longitude || 0,
        label: `${d.booking?.customer?.firstName} ${d.booking?.customer?.lastName} - ${d.booking?.service?.name}`,
        dispatchId: d.id,
      };
    });

    const originStop = origin?.latitude && origin?.longitude
      ? { lat: origin.latitude, lng: origin.longitude, label: `${origin.firstName} ${origin.lastName} (Start)` }
      : undefined;

    const result = await this.routingService.optimizeRoute(stops, originStop);

    const orderedDispatches = result.orderedStops
      .map((stop) => dispatches.find((d) => {
        const addr = d.booking?.customer?.addresses?.[0];
        return addr?.latitude === stop.lat && addr?.longitude === stop.lng;
      }))
      .filter(Boolean);

    return {
      success: true,
      data: {
        orderedDispatches,
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
        origin: originStop || null,
      },
    };
  }
}
