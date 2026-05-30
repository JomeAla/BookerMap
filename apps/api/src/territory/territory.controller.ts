import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TerritoryService } from './territory.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';

@ApiTags('Territories')
@ApiBearerAuth()
@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all territories', description: 'Returns all territories for the tenant' })
  @ApiResponse({ status: 200, description: 'List of territories' })
  findAll(@TenantId() tenantId: string) {
    return this.territoryService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get territory by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Territory ID' })
  @ApiResponse({ status: 200, description: 'Territory found' })
  @ApiResponse({ status: 404, description: 'Territory not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.territoryService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new territory' })
  @ApiResponse({ status: 201, description: 'Territory created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@TenantId() tenantId: string, @Body() dto: CreateTerritoryDto) {
    return this.territoryService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a territory' })
  @ApiParam({ name: 'id', type: String, description: 'Territory ID' })
  @ApiResponse({ status: 200, description: 'Territory updated' })
  @ApiResponse({ status: 404, description: 'Territory not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateTerritoryDto>) {
    return this.territoryService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a territory' })
  @ApiParam({ name: 'id', type: String, description: 'Territory ID' })
  @ApiResponse({ status: 204, description: 'Territory deleted' })
  @ApiResponse({ status: 404, description: 'Territory not found' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.territoryService.remove(tenantId, id);
  }

  @Post(':id/services')
  @ApiOperation({ summary: 'Link service to territory', description: 'Associate a service with a territory and set pricing' })
  @ApiParam({ name: 'id', type: String, description: 'Territory ID' })
  @ApiResponse({ status: 201, description: 'Service linked to territory' })
  linkService(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { serviceId: string; price?: number },
  ) {
    return this.territoryService.linkService(tenantId, id, body.serviceId, body.price);
  }

  @Delete(':id/services/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink service from territory', description: 'Remove a service association from a territory' })
  @ApiParam({ name: 'id', type: String, description: 'Territory ID' })
  @ApiParam({ name: 'serviceId', type: String, description: 'Service ID' })
  @ApiResponse({ status: 204, description: 'Service unlinked' })
  unlinkService(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.territoryService.unlinkService(tenantId, id, serviceId);
  }
}
