import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let databaseStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'disconnected';
      this.logger.error('Health check: database is disconnected');
    }

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: databaseStatus,
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
    };
  }

  @Get('readiness')
  async readiness() {
    let databaseStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'disconnected';
    }

    if (databaseStatus !== 'connected') {
      return { status: 'not ready', database: databaseStatus };
    }

    return { status: 'ready', database: databaseStatus };
  }

  @Get('liveness')
  liveness() {
    return { status: 'alive', uptime: process.uptime() };
  }
}
