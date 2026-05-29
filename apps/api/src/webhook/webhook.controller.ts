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
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
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
  async findAll(@CurrentUser() user: { tenantId: string }) {
    return this.webhookService.getWebhooks(user.tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'List available webhook events' })
  async listEvents() {
    return WEBHOOK_EVENTS;
  }

  @Post()
  @ApiOperation({ summary: 'Register a new webhook' })
  async create(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.registerWebhook(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.updateWebhook(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  async remove(@Param('id') id: string) {
    return this.webhookService.deleteWebhook(id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test a webhook dispatch' })
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
