import { Controller, Get, Patch, Param, Body, UseGuards, HttpException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Controller('technician')
@UseGuards(JwtAuthGuard)
export class TechnicianController {
  constructor(private prisma: PrismaService) {}

  @Get('jobs')
  async getMyJobs(@CurrentUser() user: any, @TenantId() tenantId: string) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        assignedToId: user.sub,
        booking: { tenantId, startTime: { gte: new Date(new Date().toDateString()) } },
      },
      include: {
        booking: {
          include: {
            customer: { include: { addresses: true } },
            service: true,
          },
        },
      },
      orderBy: { booking: { startTime: 'asc' } },
    });

    return { success: true, data: dispatches };
  }

  @Patch('jobs/:dispatchId')
  async updateJobStatus(
    @Param('dispatchId') dispatchId: string,
    @Body() body: { status: JobStatus },
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id: dispatchId, assignedToId: user.sub, booking: { tenantId } },
    });
    if (!dispatch) throw new HttpException('Dispatch not found', 404);

    const data: any = { status: body.status };
    if (body.status === 'STARTED') data.startedAt = new Date();
    if (body.status === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.dispatch.update({
      where: { id: dispatchId },
      data,
      include: {
        booking: { include: { customer: true, service: true } },
        assignedTo: true,
      },
    });

    return { success: true, data: updated };
  }
}
