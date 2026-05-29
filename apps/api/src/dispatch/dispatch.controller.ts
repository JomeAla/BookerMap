import {
  Controller, Get, Post, Patch,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('dispatches')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateDispatchDto) {
    return this.dispatchService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.dispatchService.findAll(tenantId);
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.dispatchService.findById(tenantId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.dispatchService.updateStatus(tenantId, id, dto.status);
  }

  @Post(':id/assign')
  assignTechnician(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.dispatchService.assignTechnician(tenantId, id, body.assignedToId);
  }

  @Get('technician/:technicianId')
  findByTechnician(
    @TenantId() tenantId: string,
    @Param('technicianId') technicianId: string,
  ) {
    return this.dispatchService.findJobsByTechnician(tenantId, technicianId);
  }
}
