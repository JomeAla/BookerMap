import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { LogUsageDto } from './dto/log-usage.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.findAll(tenantId, { search, category });
  }

  @Get('low-stock')
  getLowStock(@TenantId() tenantId: string) {
    return this.inventoryService.getLowStockItems(tenantId);
  }

  @Get('usage/:bookingId')
  getBookingUsage(@TenantId() tenantId: string, @Param('bookingId') bookingId: string) {
    return this.inventoryService.getBookingUsage(tenantId, bookingId);
  }

  @Get('report')
  getUsageReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getUsageReport(tenantId, startDate, endDate);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Post('usage')
  logUsage(@TenantId() tenantId: string, @Body() dto: LogUsageDto) {
    return this.inventoryService.logUsage(tenantId, dto);
  }

  @Post(':id/adjust')
  adjustStock(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(tenantId, id, dto.delta);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.remove(tenantId, id);
  }
}
