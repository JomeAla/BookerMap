import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  async upload(tenantId: string, data: { bookingId: string; fileName: string; fileType: string; fileSize: number; data: string; category?: string; uploadedBy?: string }) {
    if (!this.ALLOWED_TYPES.includes(data.fileType)) {
      throw new BadRequestException(`File type ${data.fileType} not allowed. Allowed: ${this.ALLOWED_TYPES.join(', ')}`);
    }
    if (data.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    return this.prisma.bookingFile.create({
      data: {
        tenantId,
        bookingId: data.bookingId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        data: data.data,
        category: data.category || 'photo',
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async getBookingFiles(tenantId: string, bookingId: string) {
    return this.prisma.bookingFile.findMany({
      where: { tenantId, bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFile(id: string, tenantId: string) {
    const file = await this.prisma.bookingFile.findFirst({ where: { id, tenantId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async deleteFile(id: string, tenantId: string) {
    await this.prisma.bookingFile.deleteMany({ where: { id, tenantId } });
  }

  async deleteBookingFiles(tenantId: string, bookingId: string) {
    await this.prisma.bookingFile.deleteMany({ where: { tenantId, bookingId } });
  }
}
