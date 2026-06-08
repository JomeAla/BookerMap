import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateServiceDto) {
    const { modifiers, intakeFields, ...data } = dto;
    return this.prisma.service.create({
      data: {
        ...data,
        tenantId,
        modifiers: modifiers
          ? { create: modifiers }
          : undefined,
        intakeFields: intakeFields
          ? { create: intakeFields.map((f, i) => ({ ...f, sortOrder: i })) }
          : undefined,
      },
      include: { modifiers: true, intakeFields: true, category: true, location: true },
    });
  }

  async findAll(tenantId: string, categoryId?: string, locationId?: string) {
    return this.prisma.service.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: { modifiers: true, intakeFields: true, category: true, location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
      include: { modifiers: true, intakeFields: true, category: true, location: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findById(tenantId, id);
    const { modifiers, intakeFields, categoryId, ...data } = dto;

    if (modifiers) {
      await this.prisma.serviceModifier.deleteMany({ where: { serviceId: id } });
    }
    if (intakeFields) {
      await this.prisma.intakeField.deleteMany({ where: { serviceId: id } });
    }

    const updateData: any = { ...data };
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (modifiers) updateData.modifiers = { create: modifiers };
    if (intakeFields) {
      updateData.intakeFields = { create: intakeFields.map((f, i) => ({ ...f, sortOrder: i })) };
    }

    return this.prisma.service.update({
      where: { id },
      data: updateData,
      include: { modifiers: true, intakeFields: true, category: true, location: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.service.delete({ where: { id } });
  }

  async updateImage(tenantId: string, id: string, imageUrl?: string) {
    await this.findById(tenantId, id);
    return this.prisma.service.update({
      where: { id },
      data: { imageUrl },
      include: { modifiers: true, intakeFields: true, category: true, location: true },
    });
  }

  async getAllSkills(tenantId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: UserRole.TECHNICIAN },
      select: { skills: true },
    });
    const allSkills = users.flatMap((u) => (u.skills as string[]) || []);
    return [...new Set(allSkills)].sort();
  }

  async createCategory(tenantId: string, data: { name: string; sortOrder?: number }) {
    return this.prisma.serviceCategory.create({
      data: { ...data, tenantId },
    });
  }

  async findAllCategories(tenantId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { services: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateCategory(tenantId: string, id: string, data: { name?: string; sortOrder?: number }) {
    const cat = await this.prisma.serviceCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }
}
