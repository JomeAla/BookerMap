import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CouponService } from './coupon.service';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.couponService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.couponService.findAll(tenantId);
  }

  @Get('validate')
  validate(
    @TenantId() tenantId: string,
    @Query('code') code: string,
    @Query('amount') amount: string,
  ) {
    return this.couponService.validate(tenantId, code, parseFloat(amount));
  }

  @Get(':id')
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponService.findById(tenantId, id);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.couponService.update(tenantId, id, dto);
  }

  @Delete(':id')
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponService.delete(tenantId, id);
  }
}
