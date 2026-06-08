import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class LocationWsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const user = (client as any).user;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    if (user.role !== 'TECHNICIAN') {
      throw new WsException('Only technicians can emit location updates');
    }
    return true;
  }
}
