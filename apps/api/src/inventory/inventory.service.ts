import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { LogUsageDto } from './dto/log-usage.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: { ...dto, tenantId },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { search?: string; category?: string },
  ) {
    const where: any = { tenantId, isActive: true };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.findById(tenantId, id);
    return this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  async adjustStock(tenantId: string, id: string, delta: number) {
    const item = await this.findById(tenantId, id);
    const newQty = item.quantity + delta;
    if (newQty < 0) throw new BadRequestException('Insufficient stock');
    return this.prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQty },
    });
  }

  async logUsage(tenantId: string, dto: LogUsageDto) {
    const item = await this.findById(tenantId, dto.itemId);
    if (item.quantity < dto.quantity) {
      throw new BadRequestException(`Insufficient stock for ${item.name}. Available: ${item.quantity}, Required: ${dto.quantity}`);
    }
    const [usage] = await this.prisma.$transaction([
      this.prisma.bookingInventory.create({
        data: {
          tenantId,
          bookingId: dto.bookingId,
          itemId: dto.itemId,
          quantityUsed: dto.quantity,
          unitCostAtTime: item.unitCost,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: dto.itemId },
        data: { quantity: { decrement: dto.quantity } },
      }),
    ]);
    return usage;
  }

  async getLowStock(tenantId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        quantity: { lte: 0 },
      },
    });
  }

  async getLowStockItems(tenantId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        quantity: { lte: 0 },
      },
    });
  }

  async getBookingUsage(tenantId: string, bookingId: string) {
    return this.prisma.bookingInventory.findMany({
      where: { tenantId, bookingId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUsageReport(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const usage = await this.prisma.bookingInventory.findMany({
      where,
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    const aggregated: Record<string, { item: any; totalUsed: number; totalCost: number; usages: typeof usage }> = {};
    for (const u of usage) {
      if (!aggregated[u.itemId]) {
        aggregated[u.itemId] = { item: u.item, totalUsed: 0, totalCost: 0, usages: [] };
      }
      aggregated[u.itemId].totalUsed += u.quantityUsed;
      aggregated[u.itemId].totalCost += u.quantityUsed * u.unitCostAtTime;
      aggregated[u.itemId].usages.push(u);
    }
    return Object.values(aggregated);
  }
}
