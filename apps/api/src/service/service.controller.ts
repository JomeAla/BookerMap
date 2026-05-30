import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceImageDto } from './dto/update-service-image.dto';

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

  @Patch(':id/image')
  updateImage(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateServiceImageDto) {
    return this.serviceService.updateImage(tenantId, id, dto.imageUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.serviceService.remove(tenantId, id);
  }

  @Get('skills')
  getSkills(@TenantId() tenantId: string) {
    return this.serviceService.getAllSkills(tenantId);
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
