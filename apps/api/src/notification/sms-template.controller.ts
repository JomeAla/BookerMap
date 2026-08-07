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
import { SmsTemplateService } from './sms-template.service';
import {
  CreateSmsTemplateDto,
  UpdateSmsTemplateDto,
} from './dto/sms-template.dto';

@ApiTags('SMS Templates')
@ApiBearerAuth()
@Controller('notifications/sms-templates')
@UseGuards(JwtAuthGuard)
export class SmsTemplateController {
  constructor(private readonly service: SmsTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List SMS templates', description: 'Returns all SMS templates for the tenant' })
  @ApiResponse({ status: 200, description: 'List of SMS templates' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SMS template by ID' })
  @ApiParam({ name: 'id', type: String, description: 'SMS template ID' })
  @ApiResponse({ status: 200, description: 'SMS template found' })
  @ApiResponse({ status: 404, description: 'SMS template not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create SMS template', description: 'Create a new reusable SMS message template' })
  @ApiResponse({ status: 201, description: 'SMS template created' })
  create(@TenantId() tenantId: string, @Body() dto: CreateSmsTemplateDto) {
    return this.service.create(tenantId, dto);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default SMS templates', description: 'Create default templates (booking confirmation, reminder, en-route) if they do not exist' })
  @ApiResponse({ status: 201, description: 'Default templates seeded' })
  seedDefaults(@TenantId() tenantId: string) {
    return this.service.seedDefaults(tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update SMS template' })
  @ApiParam({ name: 'id', type: String, description: 'SMS template ID' })
  @ApiResponse({ status: 200, description: 'SMS template updated' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSmsTemplateDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle SMS template active state' })
  @ApiParam({ name: 'id', type: String, description: 'SMS template ID' })
  @ApiResponse({ status: 200, description: 'SMS template toggled' })
  async toggle(@TenantId() tenantId: string, @Param('id') id: string) {
    const tpl = await this.service.findById(tenantId, id);
    return this.service.update(tenantId, id, { isActive: !tpl.isActive });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete SMS template' })
  @ApiParam({ name: 'id', type: String, description: 'SMS template ID' })
  @ApiResponse({ status: 204, description: 'SMS template deleted' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
