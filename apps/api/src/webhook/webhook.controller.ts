import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WebhookService, WEBHOOK_EVENTS } from './webhook.service';
import { WebhookActionService } from './webhook-action.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { ExternalWebhookDto } from './dto/external-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookActionService: WebhookActionService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List all webhooks for tenant' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async findAll(@CurrentUser() user: { tenantId: string }) {
    return this.webhookService.getWebhooks(user.tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('events')
  @ApiOperation({ summary: 'List available webhook events' })
  @ApiResponse({ status: 200, description: 'List of webhook event types' })
  async listEvents() {
    return WEBHOOK_EVENTS;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Register a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook registered' })
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.registerWebhook(user.tenantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiParam({ name: 'id', type: String, description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.updateWebhook(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', type: String, description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async remove(@Param('id') id: string) {
    return this.webhookService.deleteWebhook(id);
  }

  @Post('external')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: 'External webhook trigger', description: 'Trigger AI actions via webhook using secret-based auth' })
  @ApiHeader({ name: 'x-webhook-secret', required: true, description: 'Webhook secret for authentication' })
  @ApiHeader({ name: 'x-tenant-slug', required: true, description: 'Tenant slug' })
  @ApiResponse({ status: 200, description: 'Action executed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook secret' })
  async external(
    @Body() dto: ExternalWebhookDto,
    @Headers('x-webhook-secret') webhookSecret: string,
    @Headers('x-tenant-slug') tenantSlug: string,
  ) {
    const slug = dto.tenantSlug || tenantSlug;
    if (!slug || !webhookSecret) {
      return { success: false, message: 'x-tenant-slug and x-webhook-secret headers are required' };
    }
    const tenantId = await this.webhookActionService.authenticate(slug, webhookSecret);
    const result = await this.webhookActionService.handleAction(tenantId, dto.action as any, dto.payload);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('test')
  @ApiOperation({ summary: 'Test a webhook dispatch' })
  @ApiResponse({ status: 200, description: 'Test webhook dispatched' })
  async test(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { webhookId: string; event: string },
  ) {
    const webhook = await this.webhookService.getWebhookById(body.webhookId);
    const payload = {
      test: true,
      webhookId: webhook.id,
      event: body.event,
      message: 'This is a test webhook dispatch from BookerMap',
    };
    await this.webhookService.dispatchEvent(user.tenantId, body.event, payload);
    return { message: 'Test webhook dispatched', event: body.event, url: webhook.url };
  }
}
