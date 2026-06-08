import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateTenantDto) {
    const slug = dto.slug || this.slugify(dto.name);

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Tenant with slug "${slug}" already exists`);
    }

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        domain: dto.domain,
      },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Tenant with slug "${dto.slug}" already exists`);
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, bookings: true } },
        },
      }),
      this.prisma.tenant.count(),
    ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleActive(id: string, active: boolean) {
    await this.findById(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: active },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.tenant.delete({ where: { id } });
  }
}
