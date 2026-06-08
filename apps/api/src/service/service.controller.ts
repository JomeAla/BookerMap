import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, File as MulterFile } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateServiceImageDto } from './dto/update-service-image.dto';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  @ApiOperation({ summary: 'List all services', description: 'Returns all services for the tenant' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'locationId', required: false, type: String, description: 'Filter by location' })
  @ApiResponse({ status: 200, description: 'List of services' })
  findAll(@TenantId() tenantId: string, @Query('categoryId') categoryId?: string, @Query('locationId') locationId?: string) {
    return this.serviceService.findAll(tenantId, categoryId, locationId);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Get all service skills', description: 'Returns all unique skills across services' })
  @ApiResponse({ status: 200, description: 'List of skills' })
  getSkills(@TenantId() tenantId: string) {
    return this.serviceService.getAllSkills(tenantId);
  }

  @Get('categories/all')
  @ApiOperation({ summary: 'Get all categories', description: 'Returns all service categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAllCategories(@TenantId() tenantId: string) {
    return this.serviceService.findAllCategories(tenantId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a service category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  createCategory(@TenantId() tenantId: string, @Body() data: { name: string; sortOrder?: number }) {
    return this.serviceService.createCategory(tenantId, data);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a service category' })
  @ApiParam({ name: 'id', type: String, description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  updateCategory(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: { name?: string; sortOrder?: number },
  ) {
    return this.serviceService.updateCategory(tenantId, id, data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.serviceService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, description: 'Service created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@TenantId() tenantId: string, @Body() dto: CreateServiceDto) {
    return this.serviceService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiParam({ name: 'id', type: String, description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceService.update(tenantId, id, dto);
  }

  @Patch(':id/image')
  @ApiOperation({ summary: 'Update service image', description: 'Update the image URL for a service' })
  @ApiParam({ name: 'id', type: String, description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Image updated' })
  updateImage(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateServiceImageDto) {
    return this.serviceService.updateImage(tenantId, id, dto.imageUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiParam({ name: 'id', type: String, description: 'Service ID' })
  @ApiResponse({ status: 204, description: 'Service deleted' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.serviceService.remove(tenantId, id);
  }

  @Post(':id/image/upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination(_req: Request, _file: MulterFile, cb: (error: Error | null, destination: string) => void) {
        const dir = join(process.cwd(), 'uploads', 'services');
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename(_req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  @ApiOperation({ summary: 'Upload service image', description: 'Upload an image file for a service' })
  @ApiParam({ name: 'id', type: String, description: 'Service ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  uploadImage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `uploads/services/${file.filename}`;
    return this.serviceService.updateImage(tenantId, id, imageUrl);
  }

  }
