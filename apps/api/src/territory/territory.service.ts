import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';

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
}
