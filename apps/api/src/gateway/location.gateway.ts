import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationService } from '../location/location.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/location',
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private locationService: LocationService) {}

  handleConnection(client: Socket) {
    const { tenantId } = client.handshake.query || {};
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinTracking')
  async handleJoinTracking(client: Socket, bookingId: string) {
    client.join(`booking:${bookingId}`);
    return { event: 'joinedTracking', data: { bookingId } };
  }

  @SubscribeMessage('leaveTracking')
  async handleLeaveTracking(client: Socket, bookingId: string) {
    client.leave(`booking:${bookingId}`);
    return { event: 'leftTracking', data: { bookingId } };
  }

  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(client: Socket, data: { latitude: number; longitude: number; accuracy?: number; speed?: number; heading?: number; bookingId?: string; userId: string; tenantId: string }) {
    const { tenantId, userId, bookingId, latitude, longitude, accuracy, speed, heading } = data;
    await this.locationService.saveLocation(tenantId, { userId, bookingId, latitude, longitude, accuracy, speed, heading });
    if (bookingId) {
      this.server.to(`booking:${bookingId}`).emit('locationUpdate', {
        userId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
