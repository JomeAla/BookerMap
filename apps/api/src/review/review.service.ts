import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewReplyDto } from './dto/review-reply.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private webhook: WebhookService,
  ) {}

  async create(tenantId: string, userId: string, userRole: string, userEmail: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { customer: true, service: true, technician: true },
    });

    if (!booking || booking.tenantId !== tenantId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed bookings');
    }

    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      throw new BadRequestException('A review for this booking already exists');
    }

    if (userRole === 'CUSTOMER') {
      const customer = await this.prisma.customer.findFirst({
        where: { tenantId, email: userEmail },
      });
      if (!customer || customer.id !== booking.customerId) {
        throw new ForbiddenException('You can only review your own bookings');
      }
    }

    const review = await this.prisma.review.create({
      data: {
        tenantId,
        bookingId: dto.bookingId,
        customerId: booking.customerId,
        technicianId: booking.technicianId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        booking: { include: { service: true, customer: true, technician: true } },
      },
    });

    this.webhook.dispatchEvent(tenantId, 'review.created', {
      reviewId: review.id,
      bookingId: review.bookingId,
      rating: review.rating,
      serviceName: review.booking.service.name,
    });

    return review;
  }

  async findAll(tenantId: string, filters: ReviewFilterDto) {
    const where: any = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.serviceId) {
      where.booking = { serviceId: filters.serviceId };
    }
    if (filters.technicianId) where.technicianId = filters.technicianId;

    return this.prisma.review.findMany({
      where,
      include: {
        booking: { include: { service: true, customer: true, technician: true } },
        customer: true,
        technician: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublic(tenantSlug?: string, serviceId?: string) {
    const where: any = { status: 'APPROVED' };

    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) return [];
      where.tenantId = tenant.id;
    }

    if (serviceId) {
      where.booking = { ...(where.booking || {}), serviceId };
    }

    return this.prisma.review.findMany({
      where,
      include: {
        booking: { include: { service: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, tenantId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.tenantId !== tenantId) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    this.webhook.dispatchEvent(tenantId, 'review.updated', {
      reviewId: id,
      status: 'APPROVED',
    });

    return updated;
  }

  async reject(id: string, tenantId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.tenantId !== tenantId) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    this.webhook.dispatchEvent(tenantId, 'review.updated', {
      reviewId: id,
      status: 'REJECTED',
    });

    return updated;
  }

  async reply(id: string, tenantId: string, dto: ReviewReplyDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.tenantId !== tenantId) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { adminReply: dto.adminReply },
    });

    this.webhook.dispatchEvent(tenantId, 'review.updated', {
      reviewId: id,
      hasReply: true,
    });

    return updated;
  }
}
