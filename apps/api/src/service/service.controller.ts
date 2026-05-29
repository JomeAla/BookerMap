import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.serviceService.findAll(tenantId, categoryId);
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.serviceService.findById(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateServiceDto) {
    return this.serviceService.create(tenantId, dto);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.serviceService.remove(tenantId, id);
  }

  @Get('categories/all')
  findAllCategories(@TenantId() tenantId: string) {
    return this.serviceService.findAllCategories(tenantId);
  }

  @Post('categories')
  createCategory(@TenantId() tenantId: string, @Body() data: { name: string; sortOrder?: number }) {
    return this.serviceService.createCategory(tenantId, data);
  }

  @Patch('categories/:id')
  updateCategory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: { name?: string; sortOrder?: number },
  ) {
    return this.serviceService.updateCategory(tenantId, id, data);
  }
}
