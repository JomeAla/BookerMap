import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { DomainService } from './domain.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddDomainDto } from './dto/add-domain.dto';
import { VerifyDomainDto } from './dto/verify-domain.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly domainService: DomainService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant', description: 'Register a new tenant/business' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Find tenant by slug', description: 'Look up a tenant by its URL slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.tenantService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant', description: 'Update tenant information' })
  @ApiParam({ name: 'id', type: String, description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Post('domain/add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add custom domain', description: 'Add a custom domain for the tenant\'s booking portal' })
  @ApiResponse({ status: 200, description: 'Domain added successfully' })
  @ApiResponse({ status: 409, description: 'Domain already in use' })
  addDomain(@CurrentUser() user: any, @Body() dto: AddDomainDto) {
    return this.domainService.addDomain(user.tenantId, dto.domain);
  }

  @Post('domain/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify custom domain', description: 'Verify DNS record for the custom domain' })
  @ApiResponse({ status: 200, description: 'Domain verified successfully' })
  @ApiResponse({ status: 400, description: 'Verification failed' })
  verifyDomain(@CurrentUser() user: any, @Body() dto: VerifyDomainDto) {
    return this.domainService.verifyDomain(user.tenantId, dto.force);
  }

  @Delete('domain/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove custom domain', description: 'Remove the custom domain configuration' })
  @ApiResponse({ status: 200, description: 'Domain removed successfully' })
  removeDomain(@CurrentUser() user: any) {
    return this.domainService.removeDomain(user.tenantId);
  }

  @Get('domain/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain config', description: 'Get DNS configuration instructions for the custom domain' })
  @ApiResponse({ status: 200, description: 'Domain configuration' })
  async getDomainConfig(@CurrentUser() user: any) {
    const tenant = await this.tenantService.findById(user.tenantId);
    return this.domainService.getDomainConfig(tenant);
  }
}
