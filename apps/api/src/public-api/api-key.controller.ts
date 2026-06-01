import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ApiKeyService } from './api-key.service';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  private readonly logger = new Logger(ApiKeyController.name);

  constructor(private apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  async generateKey(
    @TenantId() tenantId: string,
    @Body() body: { name: string; scopes: string[]; rateLimit?: number; expiresAt?: string },
  ) {
    return this.apiKeyService.generateKey(tenantId, body.name, body.scopes, body.rateLimit, body.expiresAt);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async listKeys(@TenantId() tenantId: string) {
    const keys = await this.apiKeyService.listKeys(tenantId);
    return { data: keys };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API key info' })
  async getKeyInfo(@TenantId() tenantId: string, @Param('id') id: string) {
    const key = await this.apiKeyService.getKeyInfo(tenantId, id);
    return { data: key };
  }

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

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeKey(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.apiKeyService.revokeKey(tenantId, id);
    return { data: { id, revoked: true } };
  }
}
