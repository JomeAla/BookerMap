import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        availability: true,
        skills: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        availability: true,
        skills: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        availability: true,
        skills: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findById(tenantId, id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        availability: true,
        skills: true,
      },
    });
  }

  async getAvailability(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { availability: true },
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user.availability;
  }

  async updateAvailability(tenantId: string, id: string, dto: UpdateAvailabilityDto) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({
      where: { id },
      data: { availability: dto.availability },
      select: { availability: true },
    });
  }

  async getSkills(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { skills: true },
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user.skills;
  }

  async updateSkills(tenantId: string, id: string, dto: UpdateSkillsDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, role: 'TECHNICIAN' },
    });
    if (!user) throw new NotFoundException(`Technician with id "${id}" not found`);
    return this.prisma.user.update({
      where: { id },
      data: { skills: dto.skills },
      select: { skills: true },
    });
  }

  async getAllSkills(tenantId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: 'TECHNICIAN' },
      select: { skills: true },
    });
    const allSkills = users.flatMap((u) => (u.skills as string[]) || []);
    return [...new Set(allSkills)].sort();
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    return this.prisma.user.delete({
      where: { id },
      select: { id: true },
    });
  }
}
