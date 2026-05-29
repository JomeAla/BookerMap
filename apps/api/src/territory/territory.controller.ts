import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TerritoryService } from './territory.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.territoryService.findAll(tenantId);
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.territoryService.findById(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateTerritoryDto) {
    return this.territoryService.create(tenantId, dto);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateTerritoryDto>) {
    return this.territoryService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.territoryService.remove(tenantId, id);
  }

  @Post(':id/services')
  linkService(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { serviceId: string; price?: number },
  ) {
    return this.territoryService.linkService(tenantId, id, body.serviceId, body.price);
  }

  @Delete(':id/services/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkService(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.territoryService.unlinkService(tenantId, id, serviceId);
  }
}
