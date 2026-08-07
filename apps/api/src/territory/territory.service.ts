import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

@Injectable()
export class TerritoryService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTerritoryDto) {
    const { services, ...data } = dto;
    return this.prisma.territory.create({
      data: {
        ...data,
        tenantId,
        territoryServices: services
          ? { create: services.map(s => ({ serviceId: s.serviceId, price: s.price })) }
          : undefined,
      },
      include: { territoryServices: { include: { service: true } } },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.territory.findMany({
      where: { tenantId, isActive: true },
      include: { territoryServices: { include: { service: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const territory = await this.prisma.territory.findFirst({
      where: { id, tenantId },
      include: { territoryServices: { include: { service: true } } },
    });
    if (!territory) throw new NotFoundException('Territory not found');
    return territory;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTerritoryDto>) {
    await this.findById(tenantId, id);
    const { services, ...data } = dto;

    if (services) {
      await this.prisma.territoryService.deleteMany({ where: { territoryId: id } });
    }

    return this.prisma.territory.update({
      where: { id },
      data: {
        ...data,
        ...(services
          ? { territoryServices: { create: services.map(s => ({ serviceId: s.serviceId, price: s.price })) } }
          : {}),
      },
      include: { territoryServices: { include: { service: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.territory.delete({ where: { id } });
  }

  async linkService(tenantId: string, id: string, serviceId: string, price?: number) {
    await this.findById(tenantId, id);
    const service = await this.prisma.service.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) throw new NotFoundException('Service not found');

    const existing = await this.prisma.territoryService.findUnique({
      where: { territoryId_serviceId: { territoryId: id, serviceId } },
    });
    if (existing) throw new BadRequestException('Service already linked to this territory');

    return this.prisma.territoryService.create({
      data: { territoryId: id, serviceId, price },
      include: { service: true },
    });
  }

  async unlinkService(tenantId: string, id: string, serviceId: string) {
    await this.findById(tenantId, id);
    const ts = await this.prisma.territoryService.findUnique({
      where: { territoryId_serviceId: { territoryId: id, serviceId } },
    });
    if (!ts) throw new NotFoundException('Service not linked to this territory');
    return this.prisma.territoryService.delete({
      where: { territoryId_serviceId: { territoryId: id, serviceId } },
    });
  }

  async getAvailability(tenantId: string, id: string) {
    const territory = await this.findById(tenantId, id);
    const availability =
      (territory.availability as Record<string, { start: string; end: string } | null> | null) ||
      {};
    return { territoryId: id, availability };
  }

  async updateAvailability(
    tenantId: string,
    id: string,
    availability: Record<string, { start: string; end: string } | null>,
  ) {
    await this.findById(tenantId, id);
    this.validateAvailability(availability);
    return this.prisma.territory.update({
      where: { id },
      data: { availability },
      select: { id: true, name: true, availability: true },
    });
  }

  async isWithinTerritoryHours(
    tenantId: string,
    territoryId: string | null,
    date: Date,
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!territoryId) return { ok: true };
    const territory = await this.prisma.territory.findFirst({
      where: { id: territoryId, tenantId },
      select: { availability: true, name: true },
    });
    if (!territory) return { ok: true };

    const availability =
      (territory.availability as Record<string, { start: string; end: string } | null> | null) ||
      {};
    if (Object.keys(availability).length === 0) return { ok: true };

    const dayName = DAY_NAMES[date.getDay()];
    const hours = availability[dayName];
    if (!hours) {
      return { ok: false, reason: `${territory.name} is closed on ${dayName}` };
    }

    const requestedMinutes = date.getHours() * 60 + date.getMinutes();
    const openMinutes = this.timeToMinutes(hours.start);
    const closeMinutes = this.timeToMinutes(hours.end);

    if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
      return {
        ok: false,
        reason: `${territory.name} is only open ${hours.start}-${hours.end} on ${dayName}`,
      };
    }
    return { ok: true };
  }

  private validateAvailability(availability: Record<string, { start: string; end: string } | null>) {
    const validDays = new Set(DAY_NAMES);
    for (const [day, hours] of Object.entries(availability)) {
      if (!validDays.has(day.toLowerCase())) {
        throw new BadRequestException(`Invalid day: ${day}. Use full day names (monday, tuesday, etc.)`);
      }
      if (hours !== null) {
        if (!hours.start || !hours.end) {
          throw new BadRequestException(`${day}: both start and end are required (or set to null for closed)`);
        }
        if (!/^\d{2}:\d{2}$/.test(hours.start) || !/^\d{2}:\d{2}$/.test(hours.end)) {
          throw new BadRequestException(`${day}: times must be HH:MM format`);
        }
        if (this.timeToMinutes(hours.start) >= this.timeToMinutes(hours.end)) {
          throw new BadRequestException(`${day}: end time must be after start time`);
        }
      }
    }
  }

  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
}
