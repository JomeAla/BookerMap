import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PricingService } from './pricing.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  findAll(@TenantId() tenantId: string) {
    return this.pricingService.findAll(tenantId);
  }

  @Post('rules')
  create(@TenantId() tenantId: string, @Body() dto: CreatePricingRuleDto) {
    return this.pricingService.create(tenantId, dto);
  }

  @Put('rules/:id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.pricingService.update(tenantId, id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pricingService.delete(tenantId, id);
  }

  @Post('calculate')
  calculate(
    @TenantId() tenantId: string,
    @Body() body: { serviceId: string; dateTime: string; basePrice: number },
  ) {
    return this.pricingService.applyPricing(
      tenantId,
      body.basePrice,
      body.serviceId,
      new Date(body.dateTime),
    );
  }
}
