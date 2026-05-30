import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class BookingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { tenantId } = client.handshake.query || {};
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
  }

  handleDisconnect(client: Socket) {}

  notifyBookingCreated(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('booking:created', data);
  }

  notifyBookingUpdated(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('booking:updated', data);
  }

  notifyBookingCanceled(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('booking:canceled', data);
  }

  notifyDispatchAssigned(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('dispatch:assigned', data);
  }

  notifyNewNotification(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('notification:new', data);
  }
}
