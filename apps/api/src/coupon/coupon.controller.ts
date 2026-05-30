import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CouponService } from './coupon.service';

@ApiTags('Coupons')
@ApiBearerAuth()
@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiOperation({ summary: 'Create a coupon', description: 'Create a new discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.couponService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all coupons', description: 'Returns all coupons for the tenant' })
  @ApiResponse({ status: 200, description: 'List of coupons' })
  findAll(@TenantId() tenantId: string) {
    return this.couponService.findAll(tenantId);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate a coupon code', description: 'Check if a coupon code is valid and calculate discount' })
  @ApiQuery({ name: 'code', required: true, type: String, description: 'Coupon code' })
  @ApiQuery({ name: 'amount', required: true, type: Number, description: 'Order amount to validate against' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  validate(
    @TenantId() tenantId: string,
    @Query('code') code: string,
    @Query('amount') amount: string,
  ) {
    return this.couponService.validate(tenantId, code, parseFloat(amount));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon found' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponService.findById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.couponService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiParam({ name: 'id', type: String, description: 'Coupon ID' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.couponService.delete(tenantId, id);
  }
}
