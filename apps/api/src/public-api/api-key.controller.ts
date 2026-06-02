import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ApiKeyService } from './api-key.service';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeyController {
  private readonly logger = new Logger(ApiKeyController.name);

  constructor(private apiKeyService: ApiKeyService) {}

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  async generateKey(
    @TenantId() tenantId: string,
    @Body() body: { name: string; scopes: string[]; rateLimit?: number; expiresAt?: string },
  ) {
    return this.apiKeyService.generateKey(tenantId, body.name, body.scopes, body.rateLimit, body.expiresAt);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async listKeys(@TenantId() tenantId: string) {
    const keys = await this.apiKeyService.listKeys(tenantId);
    return { data: keys };
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Get(':id')
  @ApiOperation({ summary: 'Get API key info' })
  async getKeyInfo(@TenantId() tenantId: string, @Param('id') id: string) {
    const key = await this.apiKeyService.getKeyInfo(tenantId, id);
    return { data: key };
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id/scopes')
  @ApiOperation({ summary: 'Update API key scopes' })
  async updateScopes(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { scopes: string[] },
  ) {
    const key = await this.apiKeyService.updateScopes(tenantId, id, body.scopes);
    return { data: key };
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeKey(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.apiKeyService.revokeKey(tenantId, id);
    return { data: { id, revoked: true } };
  }
}
