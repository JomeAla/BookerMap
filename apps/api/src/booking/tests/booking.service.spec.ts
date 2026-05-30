import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingService } from '../booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulingService } from '../scheduling.service';
import { WebhookService } from '../../webhook/webhook.service';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: any;
  let schedulingService: any;
  let webhookService: any;

  const mockPrisma = {
    service: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSchedulingService = {
    checkConflicts: jest.fn(),
  };

  const mockWebhookService = {
    dispatchEvent: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SchedulingService, useValue: mockSchedulingService },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get(PrismaService);
    schedulingService = module.get(SchedulingService);
    webhookService = module.get(WebhookService);

    jest.clearAllMocks();
    mockSchedulingService.checkConflicts.mockResolvedValue(false);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      serviceId: 'service-1',
      customerId: 'customer-1',
      startTime: '2026-06-01T10:00:00Z',
      technicianId: 'tech-1',
      notes: 'Test booking',
    };

    it('should create a booking successfully', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({
        id: 'service-1',
        duration: 60,
        price: 5000,
        modifiers: [],
      });
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockPrisma.booking.create.mockResolvedValue({
        id: 'booking-1',
        ...dto,
        totalPrice: 5000,
        status: 'PENDING',
        service: { name: 'Test Service' },
        customer: { firstName: 'John', lastName: 'Doe' },
        technician: { firstName: 'Tech', lastName: 'One' },
      });

      const result = await service.create('tenant-1', dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
      expect(result.totalPrice).toBe(5000);
      expect(mockPrisma.booking.create).toHaveBeenCalled();
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'booking.created', expect.any(Object));
    });

    it('should throw NotFoundException if service not found', async () => {
      mockPrisma.service.findFirst.mockResolvedValue(null);

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({ id: 'service-1', duration: 60, price: 5000, modifiers: [] });
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on scheduling conflict', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({ id: 'service-1', duration: 60, price: 5000, modifiers: [] });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
      mockSchedulingService.checkConflicts.mockResolvedValue(true);

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should handle modifiers pricing', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({
        id: 'service-1', duration: 60, price: 5000,
        modifiers: [
          { id: 'mod-1', name: 'Extra', price: 1000, isRequired: false },
          { id: 'mod-2', name: 'Premium', price: 2000, isRequired: false },
        ],
      });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'customer-1', firstName: 'John', lastName: 'Doe' });
      mockPrisma.booking.create.mockResolvedValue({
        id: 'booking-1', totalPrice: 8000, status: 'PENDING',
        service: {}, customer: {},
      });

      const result = await service.create('tenant-1', {
        ...dto, selectedModifiers: ['mod-1', 'mod-2'],
      } as any);

      expect(result.totalPrice).toBe(8000);
    });

    it('should throw BadRequestException for expired coupon', async () => {
      mockPrisma.service.findFirst.mockResolvedValue({ id: 'service-1', duration: 60, price: 5000, modifiers: [] });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1', code: 'EXPIRED', type: 'percentage', value: 10,
        isActive: true, expiresAt: new Date('2020-01-01'), maxUses: null, usedCount: 0, minAmount: null,
      });

      await expect(service.create('tenant-1', { ...dto, couponCode: 'EXPIRED' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return filtered bookings', async () => {
      const mockBookings = [
        { id: 'b1', status: 'PENDING', customer: {}, service: {} },
        { id: 'b2', status: 'COMPLETED', customer: {}, service: {} },
      ];
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.findAll('tenant-1', { status: 'PENDING' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', status: 'PENDING' }),
        }),
      );
    });

    it('should filter by technicianId and date range', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { technicianId: 'tech-1', dateFrom: '2026-06-01', dateTo: '2026-06-30' });

      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            technicianId: 'tech-1',
            startTime: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a booking by id', async () => {
      const mockBooking = { id: 'booking-1', status: 'PENDING', service: {}, customer: {}, technician: {}, dispatch: null, invoices: [] };
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);

      const result = await service.findById('tenant-1', 'booking-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reschedule', () => {
    const rescheduleDto = { newStartTime: '2026-07-01T14:00:00Z' };

    it('should reschedule a pending booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'PENDING',
        technicianId: 'tech-1',
        service: { duration: 60 },
        customer: {},
        technician: {},
      };
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockSchedulingService.checkConflicts.mockResolvedValue(false);
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(rescheduleDto.newStartTime),
        status: 'PENDING',
      });

      const result = await service.reschedule('tenant-1', 'booking-1', rescheduleDto);

      expect(result).toBeDefined();
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'booking.rescheduled', expect.any(Object));
    });

    it('should throw BadRequestException if booking is cancelled', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CANCELLED',
        service: { duration: 60 },
      });

      await expect(service.reschedule('tenant-1', 'booking-1', rescheduleDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking is completed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
        service: { duration: 60 },
      });

      await expect(service.reschedule('tenant-1', 'booking-1', rescheduleDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on scheduling conflict', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'PENDING',
        technicianId: 'tech-1',
        service: { duration: 60 },
        customer: {},
      });
      mockSchedulingService.checkConflicts.mockResolvedValue(true);

      await expect(service.reschedule('tenant-1', 'booking-1', rescheduleDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'PENDING',
        service: { duration: 60 },
        customer: {},
        technician: {},
      });
      mockPrisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: 'CANCELLED',
        service: {},
        customer: {},
        technician: {},
      });

      const result = await service.cancel('tenant-1', 'booking-1');

      expect(result.status).toBe('CANCELLED');
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'booking.cancelled', expect.any(Object));
    });

    it('should throw BadRequestException if already cancelled', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'CANCELLED',
        service: { duration: 60 },
      });

      await expect(service.cancel('tenant-1', 'booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if booking is completed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
        service: { duration: 60 },
        customer: {},
        technician: {},
      });

      await expect(service.cancel('tenant-1', 'booking-1')).rejects.toThrow(BadRequestException);
    });
  });
});
