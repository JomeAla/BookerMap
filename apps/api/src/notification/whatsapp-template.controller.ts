import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import {
  CreateWhatsAppTemplateDto,
  UpdateWhatsAppTemplateDto,
} from './dto/whatsapp-template.dto';

@ApiTags('WhatsApp Templates')
@ApiBearerAuth()
@Controller('notifications/whatsapp-templates')
@UseGuards(JwtAuthGuard)
export class WhatsAppTemplateController {
  constructor(private readonly service: WhatsAppTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List WhatsApp templates' })
  @ApiResponse({ status: 200, description: 'List of WhatsApp templates' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get WhatsApp template by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'WhatsApp template found' })
  @ApiResponse({ status: 404, description: 'WhatsApp template not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create WhatsApp template' })
  @ApiResponse({ status: 201, description: 'WhatsApp template created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateWhatsAppTemplateDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update WhatsApp template' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'WhatsApp template updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsAppTemplateDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle WhatsApp template active state' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'WhatsApp template toggled' })
  async toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    const tpl = await this.service.findById(tenantId, id);
    return this.service.update(tenantId, id, { isActive: !tpl.isActive });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete WhatsApp template' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'WhatsApp template deleted' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
