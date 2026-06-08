import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { LocationWsGuard } from './location.guard';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/location',
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private locationService: LocationService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token);
      (client as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      };
      const { tenantId } = payload;
      if (tenantId) {
        client.join(`tenant:${tenantId}`);
      }
    } catch {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinTracking')
  async handleJoinTracking(client: Socket, bookingId: string) {
    const user = (client as any).user;
    if (!user) return;
    const allowedRoles = ['ADMIN', 'OWNER', 'MANAGER', 'TECHNICIAN'];
    if (!allowedRoles.includes(user.role)) return;
    client.join(`booking:${bookingId}`);
    return { event: 'joinedTracking', data: { bookingId } };
  }

  @SubscribeMessage('leaveTracking')
  async handleLeaveTracking(client: Socket, bookingId: string) {
    client.leave(`booking:${bookingId}`);
    return { event: 'leftTracking', data: { bookingId } };
  }

  @UseGuards(LocationWsGuard)
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    client: Socket,
    data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      bookingId?: string;
    },
  ) {
    const user = (client as any).user;
    const { latitude, longitude, accuracy, speed, heading, bookingId } = data;

    await this.locationService.saveLocation(user.tenantId, {
      userId: user.id,
      bookingId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
    });

    const locationData = {
      userId: user.id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    };

    if (bookingId) {
      this.server.to(`booking:${bookingId}`).emit('locationUpdate', locationData);
    }

    this.server.to(`tenant:${user.tenantId}`).emit('locationUpdate', locationData);

    if (bookingId) {
      this.checkGeofence(bookingId, latitude, longitude, user.id).catch(() => {});
    }
  }

  private async checkGeofence(
    bookingId: string,
    techLat: number,
    techLng: number,
    technicianId: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          include: {
            addresses: {
              where: { latitude: { not: null }, longitude: { not: null } },
              take: 1,
            },
          },
        },
        dispatch: true,
      },
    });

    if (!booking || !booking.customer?.addresses?.length) return;

    const addr = booking.customer.addresses[0];
    if (addr.latitude == null || addr.longitude == null) return;

    const distance = haversine(techLat, techLng, addr.latitude, addr.longitude);

    if (distance < 0.1) {
      this.server.to(`booking:${bookingId}`).emit('geofenceEnter', {
        bookingId,
        technicianId,
        latitude: techLat,
        longitude: techLng,
      });

      if (booking.dispatch && booking.dispatch.status === 'ACCEPTED') {
        await this.prisma.dispatch.update({
          where: { id: booking.dispatch.id },
          data: { status: 'STARTED', startedAt: new Date() },
        });

        this.server.to(`booking:${bookingId}`).emit('statusChange', {
          bookingId,
          status: 'STARTED',
          technicianId,
        });
      }
    }
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
