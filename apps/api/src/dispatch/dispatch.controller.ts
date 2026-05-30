import {
  Controller, Get, Post, Patch,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Dispatches')
@ApiBearerAuth()
@Controller('dispatches')
@UseGuards(JwtAuthGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dispatch', description: 'Create a new dispatch record' })
  @ApiResponse({ status: 201, description: 'Dispatch created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@TenantId() tenantId: string, @Body() dto: CreateDispatchDto) {
    return this.dispatchService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all dispatches', description: 'Returns all dispatches for the tenant' })
  @ApiResponse({ status: 200, description: 'List of dispatches' })
  findAll(@TenantId() tenantId: string) {
    return this.dispatchService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispatch by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Dispatch ID' })
  @ApiResponse({ status: 200, description: 'Dispatch found' })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.dispatchService.findById(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update dispatch status' })
  @ApiParam({ name: 'id', type: String, description: 'Dispatch ID' })
  @ApiResponse({ status: 200, description: 'Dispatch status updated' })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.dispatchService.updateStatus(tenantId, id, dto.status);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign technician to dispatch', description: 'Assign or reassign a technician to a dispatch' })
  @ApiParam({ name: 'id', type: String, description: 'Dispatch ID' })
  @ApiResponse({ status: 200, description: 'Technician assigned' })
  assignTechnician(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.dispatchService.assignTechnician(tenantId, id, body.assignedToId);
  }

  @Get('technician/:technicianId')
  @ApiOperation({ summary: 'Get dispatches by technician', description: 'Returns all dispatches assigned to a specific technician' })
  @ApiParam({ name: 'technicianId', type: String, description: 'Technician user ID' })
  @ApiResponse({ status: 200, description: 'List of dispatches for technician' })
  findByTechnician(
    @TenantId() tenantId: string,
    @Param('technicianId') technicianId: string,
  ) {
    return this.dispatchService.findJobsByTechnician(tenantId, technicianId);
  }

  @Post('auto-assign/:bookingId')
  @ApiOperation({ summary: 'Auto-assign technician', description: 'Automatically assign the best available technician to a booking' })
  @ApiParam({ name: 'bookingId', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Technician auto-assigned' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  autoAssign(@Param('bookingId') bookingId: string) {
    return this.dispatchService.autoAssign(bookingId);
  }
}
