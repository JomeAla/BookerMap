import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WebhookService, WEBHOOK_EVENTS } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @ApiOperation({ summary: 'List all webhooks for tenant' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async findAll(@CurrentUser() user: { tenantId: string }) {
    return this.webhookService.getWebhooks(user.tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'List available webhook events' })
  @ApiResponse({ status: 200, description: 'List of webhook event types' })
  async listEvents() {
    return WEBHOOK_EVENTS;
  }

  @Post()
  @ApiOperation({ summary: 'Register a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook registered' })
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.registerWebhook(user.tenantId, dto);
  }

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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', type: String, description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async remove(@Param('id') id: string) {
    return this.webhookService.deleteWebhook(id);
  }

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
