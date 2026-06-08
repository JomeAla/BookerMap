import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BulkSmsService } from './bulk-sms.service';
import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

class CreateBulkSmsCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  @MaxLength(1600)
  message!: string;

  @IsOptional()
  @IsObject()
  segment?: { type: string; tag?: string; days?: number };

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

@ApiTags('Bulk SMS')
@Controller('notifications/bulk-sms')
export class BulkSmsController {
  constructor(private readonly bulkSmsService: BulkSmsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create bulk SMS campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: CreateBulkSmsCampaignDto,
  ) {
    return this.bulkSmsService.createCampaign(user.tenantId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/send')
  @ApiOperation({ summary: 'Send bulk SMS campaign' })
  @ApiResponse({ status: 200, description: 'Campaign sent' })
  async sendCampaign(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.bulkSmsService.sendCampaign(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List bulk SMS campaigns' })
  @ApiResponse({ status: 200, description: 'List of campaigns' })
  async getCampaigns(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.bulkSmsService.getCampaigns(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get campaign detail' })
  @ApiResponse({ status: 200, description: 'Campaign detail' })
  async getCampaignDetail(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.bulkSmsService.getCampaignDetail(id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete draft campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted' })
  async deleteCampaign(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.bulkSmsService.deleteCampaign(id, user.tenantId);
  }
}
