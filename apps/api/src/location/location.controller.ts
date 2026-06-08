import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateLocationUpdateDto } from './dto/create-location-update.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create a location', description: 'Create a new business location' })
  @ApiResponse({ status: 201, description: 'Location created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateLocationDto) {
    return this.locationService.create(tenantId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get()
  @ApiOperation({ summary: 'List all locations', description: 'Returns all locations for the tenant' })
  @ApiResponse({ status: 200, description: 'List of locations' })
  findAll(@TenantId() tenantId: string) {
    return this.locationService.findAll(tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('latest/:userId')
  @ApiOperation({ summary: 'Get latest location for a user', description: 'Returns the most recent location update for a technician' })
  @ApiResponse({ status: 200, description: 'Latest location' })
  getLatestLocation(@Param('userId') userId: string) {
    return this.locationService.getLatestLocation(userId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.TECHNICIAN)
  @Get('history/:bookingId')
  @ApiOperation({ summary: 'Get location history for a booking', description: 'Returns all location points for a booking' })
  @ApiResponse({ status: 200, description: 'Location history' })
  getLocationHistory(@Param('bookingId') bookingId: string) {
    return this.locationService.getLocationHistory(bookingId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location found' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.locationService.findById(tenantId, id);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a location' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationService.update(tenantId, id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location' })
  @ApiParam({ name: 'id', type: String, description: 'Location ID' })
  @ApiResponse({ status: 200, description: 'Location deleted' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.locationService.remove(tenantId, id);
  }

  @Roles(UserRole.TECHNICIAN)
  @Post('update')
  @ApiOperation({ summary: 'Save GPS location update', description: 'Save a technician GPS location update' })
  @ApiResponse({ status: 201, description: 'Location update saved' })
  saveLocationUpdate(@TenantId() tenantId: string, @Body() dto: CreateLocationUpdateDto) {
    return this.locationService.saveLocation(tenantId, dto);
  }
}
