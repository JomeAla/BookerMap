import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicCreateBookingDto } from './dto/public-create-booking.dto';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logo: true, primaryColor: true, timezone: true, currency: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, logo: true, primaryColor: true, timezone: true, currency: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getServices(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, description: true, duration: true, price: true, priceType: true, imageUrl: true, categoryId: true },
      orderBy: { name: 'asc' },
    });
  }

  async getServicesByTenantId(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.service.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, description: true, duration: true, price: true, priceType: true, imageUrl: true, categoryId: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSlots(tenantSlug: string, serviceId: string, date: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.getSlotsInternal(tenant.id, serviceId, date);
  }

  async getSlotsByTenantId(tenantId: string, serviceId: string, date: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.getSlotsInternal(tenant.id, serviceId, date);
  }

  private async getSlotsInternal(tenantId: string, serviceId: string, date: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const slots: string[] = [];
    for (let h = 8; h <= 17; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 17) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        tenantId,
        serviceId,
        startTime: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
    });

    const duration = service.duration;
    return slots.filter((slot) => {
      const [h, m] = slot.split(':').map(Number);
      const slotStart = new Date(`${date}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00.000Z`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      return !bookings.some((b) => slotStart < b.endTime && slotEnd > b.startTime);
    });
  }

  async createBooking(tenantSlug: string, dto: PublicCreateBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.createBookingInternal(tenant.id, dto);
  }

  async createBookingByTenantId(tenantId: string, dto: PublicCreateBookingDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.createBookingInternal(tenant.id, dto);
  }

  private async createBookingInternal(tenantId: string, dto: PublicCreateBookingDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + service.duration * 60000);

    const conflict = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        serviceId: dto.serviceId,
        startTime: { lt: end },
        endTime: { gt: start },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });
    if (conflict) throw new BadRequestException('This time slot is no longer available');

    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, phone: dto.phone },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
        },
      });
    }

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        serviceId: dto.serviceId,
        customerId: customer.id,
        locationId: dto.locationId || null,
        startTime: start,
        endTime: end,
        notes: dto.notes,
        totalPrice: service.price,
        status: 'PENDING',
      },
      include: {
        customer: true,
        service: true,
      },
    });

    return booking;
  }
}
