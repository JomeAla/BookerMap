import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('marketing')
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('campaigns')
  getCampaigns(@TenantId() tenantId: string) {
    return this.marketingService.getCampaigns(tenantId);
  }

  @Post('campaigns')
  createCampaign(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.marketingService.createCampaign(tenantId, dto);
  }

  @Put('campaigns/:id')
  updateCampaign(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.marketingService.updateCampaign(tenantId, id, dto);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.marketingService.deleteCampaign(tenantId, id);
  }

  @Post('campaigns/:id/run')
  runCampaign(@Param('id') id: string) {
    return this.marketingService.processCampaign(id);
  }

  @Get('campaigns/:id/logs')
  getCampaignLogs(@Param('id') id: string) {
    return this.marketingService.getCampaignLogs(id);
  }

  @Get('lapsed')
  getLapsedCustomers(@TenantId() tenantId: string, @Query('days') days: string) {
    const daysNum = parseInt(days, 10) || 30;
    return this.marketingService.findLapsedCustomers(tenantId, daysNum);
  }
}
