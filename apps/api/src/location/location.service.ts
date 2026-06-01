import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateLocationUpdateDto } from './dto/create-location-update.dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLocationDto) {
    return this.prisma.location.create({
      data: { ...dto, tenantId },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.location.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    await this.findById(tenantId, id);
    return this.prisma.location.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.location.delete({ where: { id } });
  }

  async saveLocation(tenantId: string, dto: CreateLocationUpdateDto) {
    const count = await this.prisma.locationUpdate.count({
      where: { userId: dto.userId },
    });
    if (dto.bookingId) {
      const bookingCount = await this.prisma.locationUpdate.count({
        where: { bookingId: dto.bookingId },
      });
      if (bookingCount >= 100) {
        const oldest = await this.prisma.locationUpdate.findFirst({
          where: { bookingId: dto.bookingId },
          orderBy: { timestamp: 'asc' },
        });
        if (oldest) {
          await this.prisma.locationUpdate.delete({ where: { id: oldest.id } });
        }
      }
    }
    return this.prisma.locationUpdate.create({
      data: {
        tenantId,
        userId: dto.userId,
        bookingId: dto.bookingId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        speed: dto.speed,
        heading: dto.heading,
      },
    });
  }

  async getLatestLocation(userId: string) {
    return this.prisma.locationUpdate.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getLocationHistory(bookingId: string) {
    return this.prisma.locationUpdate.findMany({
      where: { bookingId },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
  }

  async clearLocationHistory(olderThan: Date) {
    const result = await this.prisma.locationUpdate.deleteMany({
      where: { timestamp: { lt: olderThan } },
    });
    return { deleted: result.count };
  }
}
