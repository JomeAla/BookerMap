import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  private parseTags(tags: string | null): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  private formatCustomer(customer: any) {
    return { ...customer, tags: this.parseTags(customer.tags) };
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId, phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Customer with this phone already exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        tenantId,
        addresses: dto.address
          ? {
              create: {
                street: dto.address.street,
                city: dto.address.city,
                state: dto.address.state,
                zipCode: dto.address.zipCode,
                label: dto.address.label || 'Home',
                isDefault: true,
              },
            }
          : undefined,
      },
      include: {
        addresses: true,
      },
    });

    return this.formatCustomer(customer);
  }

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; search?: string; tag?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.search) {
      const search = params.search;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params.tag) {
      where.tags = { contains: params.tag, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: { addresses: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: data.map(c => this.formatCustomer(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllTags(tenantId: string): Promise<string[]> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, tags: { not: null } },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const c of customers) {
      if (c.tags) {
        c.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t));
      }
    }
    return Array.from(tagSet).sort();
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: { addresses: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    return this.formatCustomer(customer);
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.findById(tenantId, id);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: dto,
      include: { addresses: true },
    });

    return this.formatCustomer(customer);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    return this.prisma.customer.delete({
      where: { id },
      select: { id: true },
    });
  }

  async addAddress(tenantId: string, customerId: string, dto: CreateAddressDto) {
    await this.findById(tenantId, customerId);

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        customerId,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        label: dto.label || 'Home',
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async exportCsv(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'firstName,lastName,email,phone,notes,tags,createdAt';
    const rows = customers.map((c) => {
      const esc = (val: string | null | undefined) => {
        if (val == null) return '';
        const s = val.replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };
      return [esc(c.firstName), esc(c.lastName), esc(c.email), esc(c.phone), esc(c.notes), esc(c.tags), esc(c.createdAt.toISOString())].join(',');
    });

    return [header, ...rows].join('\r\n');
  }

  async importCsv(tenantId: string, csvContent: string) {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return { imported: 0, updated: 0, errors: ['CSV must have a header and at least one data row'] };
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const dataRows = lines.slice(1);
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const values = this.parseCsvRow(dataRows[i]);
        if (values.length !== header.length) {
          errors.push(`Row ${i + 2}: column count mismatch (expected ${header.length}, got ${values.length})`);
          continue;
        }

        const row: Record<string, string> = {};
        header.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const phone = row['phone']?.trim();
        if (!phone) {
          errors.push(`Row ${i + 2}: phone is required`);
          continue;
        }

        const existing = await this.prisma.customer.findFirst({
          where: { tenantId, phone },
        });

        if (existing) {
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: {
              firstName: row['firstname'] || existing.firstName,
              lastName: row['lastname'] || existing.lastName,
              email: row['email'] || existing.email,
              notes: row['notes'] || existing.notes,
              tags: row['tags'] || existing.tags,
            },
          });
          updated++;
        } else {
          await this.prisma.customer.create({
            data: {
              tenantId,
              firstName: row['firstname'] || '',
              lastName: row['lastname'] || '',
              email: row['email'] || null,
              phone,
              notes: row['notes'] || null,
              tags: row['tags'] || null,
            },
          });
          imported++;
        }
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    return { imported, updated, errors };
  }

  async updateTags(tenantId: string, id: string, tags: string[]) {
    await this.findById(tenantId, id);

    const joined = tags.filter(t => t.trim()).join(',');

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { tags: joined || null },
      include: { addresses: true },
    });

    return this.formatCustomer(customer);
  }

  private parseCsvRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  }
}
