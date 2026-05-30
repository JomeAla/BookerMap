import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a location', description: 'Create a new business location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateLocationDto) {
    return this.locationService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all locations', description: 'Returns all locations for the tenant' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  findAll(@TenantId() tenantId: string) {
    return this.locationService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location found' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.locationService.findById(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.locationService.remove(tenantId, id);
  }
}
