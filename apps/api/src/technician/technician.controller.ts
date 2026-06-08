import { Controller, Get, Patch, Param, Body, UseGuards, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@ApiTags('Technician')
@ApiBearerAuth()
@Controller('technician')
@UseGuards(JwtAuthGuard)
export class TechnicianController {
  constructor(private prisma: PrismaService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Get my jobs', description: 'Returns jobs assigned to the current technician' })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async getMyJobs(@CurrentUser() user: any, @TenantId() tenantId: string) {
    const dispatches = await this.prisma.dispatch.findMany({
      where: {
        assignedToId: user.id,
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
  @ApiOperation({ summary: 'Update job status', description: 'Update the status of a dispatch job (e.g. STARTED, COMPLETED)' })
  @ApiParam({ name: 'dispatchId', type: String, description: 'Dispatch ID' })
  @ApiResponse({ status: 200, description: 'Job status updated' })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  async updateJobStatus(
    @Param('dispatchId') dispatchId: string,
    @Body() body: { status: JobStatus },
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id: dispatchId, assignedToId: user.id, booking: { tenantId } },
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
