import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const existing = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        ...dto,
        code: dto.code.toUpperCase(),
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validate(tenantId: string, code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is no longer active');
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.minAmount && amount < coupon.minAmount) {
      throw new BadRequestException(`Minimum amount of ${coupon.minAmount} required`);
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = amount * (coupon.value / 100);
    } else {
      discount = coupon.value;
    }

    return { valid: true, coupon, discount: Math.min(discount, amount) };
  }

  async update(tenantId: string, id: string, dto: any) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.coupon.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  async incrementUsed(tenantId: string, code: string) {
    await this.prisma.coupon.update({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
      data: { usedCount: { increment: 1 } },
    });
  }
}
