import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getProfile(tenantId: string, email: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, email },
      include: { addresses: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return customer;
  }

  async updateProfile(tenantId: string, email: string, dto: UpdatePortalProfileDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, email },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: dto,
      include: { addresses: true },
    });

    return updated;
  }

  async getBookings(tenantId: string, email: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, email },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return this.prisma.booking.findMany({
      where: { tenantId, customerId: customer.id },
      include: { service: true, location: true, technician: true, invoices: true, reviews: true },
      orderBy: { startTime: 'desc' },
    });
  }
}
