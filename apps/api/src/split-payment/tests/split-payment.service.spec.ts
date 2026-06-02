import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SplitPaymentService } from '../split-payment.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SplitPaymentService', () => {
  let service: SplitPaymentService;
  let prisma: any;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
    },
    dispatch: {
      findUnique: jest.fn(),
    },
    splitPayment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitPaymentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SplitPaymentService>(SplitPaymentService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSplitPayment', () => {
    it('should create a split payment', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        tenantId: 'tenant-1',
        technicianId: 'tech-1',
        tenant: { platformFeeRate: 10 },
        invoices: [{ id: 'inv-1', total: 10000, status: 'PAID', payments: [] }],
      });
      mockPrisma.splitPayment.findFirst.mockResolvedValue(null);
      mockPrisma.splitPayment.create.mockResolvedValue({
        id: 'split-1',
        totalAmount: 10000,
        platformFee: 1000,
        providerAmount: 9000,
        platformRate: 10,
        booking: { customer: {}, service: {} },
        provider: { id: 'tech-1', firstName: 'John', lastName: 'Doe' },
        invoice: { id: 'inv-1' },
      });

      const result = await service.createSplitPayment('booking-1');

      expect(result).toBeDefined();
      expect(result.totalAmount).toBe(10000);
      expect(result.platformFee).toBe(1000);
      expect(result.providerAmount).toBe(9000);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.createSplitPayment('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no provider assigned', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        tenantId: 'tenant-1',
        technicianId: null,
        tenant: { platformFeeRate: 10 },
        invoices: [{ id: 'inv-1', total: 10000, status: 'PAID', payments: [] }],
      });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);

      await expect(service.createSplitPayment('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no paid invoice found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        tenantId: 'tenant-1',
        technicianId: 'tech-1',
        tenant: { platformFeeRate: 10 },
        invoices: [{ id: 'inv-1', total: 10000, status: 'SENT', payments: [] }],
      });

      await expect(service.createSplitPayment('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if split payment already exists', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        tenantId: 'tenant-1',
        technicianId: 'tech-1',
        tenant: { platformFeeRate: 10 },
        invoices: [{ id: 'inv-1', total: 10000, status: 'PAID', payments: [] }],
      });
      mockPrisma.splitPayment.findFirst.mockResolvedValue({ id: 'existing-split' });

      await expect(service.createSplitPayment('booking-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('releasePayment', () => {
    it('should release a pending split payment', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue({
        id: 'split-1', status: 'PENDING',
      });
      mockPrisma.splitPayment.update.mockResolvedValue({
        id: 'split-1', status: 'RELEASED', releasedAt: new Date(),
      });

      const result = await service.releasePayment('split-1');

      expect(result.status).toBe('RELEASED');
    });

    it('should throw NotFoundException if split payment not found', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue(null);

      await expect(service.releasePayment('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not pending', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue({
        id: 'split-1', status: 'RELEASED',
      });

      await expect(service.releasePayment('split-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('holdPayment', () => {
    it('should hold a split payment', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue({
        id: 'split-1', status: 'PENDING',
      });
      mockPrisma.splitPayment.update.mockResolvedValue({
        id: 'split-1', status: 'ON_HOLD',
      });

      const result = await service.holdPayment('split-1');

      expect(result.status).toBe('ON_HOLD');
    });

    it('should throw NotFoundException if split payment not found', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue(null);

      await expect(service.holdPayment('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already released', async () => {
      mockPrisma.splitPayment.findUnique.mockResolvedValue({
        id: 'split-1', status: 'RELEASED',
      });

      await expect(service.holdPayment('split-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTenantSplitPayments', () => {
    it('should return tenant split payments', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        { id: 'split-1', booking: { customer: {}, service: {} }, provider: {}, invoice: {} },
      ]);

      const result = await service.getTenantSplitPayments('tenant-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.splitPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([]);

      await service.getTenantSplitPayments('tenant-1', { status: 'PENDING' });

      expect(mockPrisma.splitPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', status: 'PENDING' }),
        }),
      );
    });
  });

  describe('getPlatformRevenue', () => {
    it('should return platform revenue summary', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        { totalAmount: 10000, platformFee: 1000, providerAmount: 9000, status: 'PENDING', createdAt: new Date() },
        { totalAmount: 20000, platformFee: 2000, providerAmount: 18000, status: 'RELEASED', createdAt: new Date() },
      ]);

      const result = await service.getPlatformRevenue('tenant-1');

      expect(result.totalRevenue).toBe(30000);
      expect(result.totalFees).toBe(3000);
      expect(result.totalPayouts).toBe(27000);
      expect(result.pendingFees).toBe(1000);
      expect(result.releasedFees).toBe(2000);
      expect(result.totalTransactions).toBe(2);
    });
  });

  describe('getProviderSplitPayments', () => {
    it('should return provider split payments with totals', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        { totalAmount: 10000, platformFee: 1000, providerAmount: 9000, status: 'PENDING', booking: { customer: {}, service: {} }, invoice: {} },
        { totalAmount: 20000, platformFee: 2000, providerAmount: 18000, status: 'RELEASED', booking: { customer: {}, service: {} }, invoice: {} },
      ]);

      const result = await service.getProviderSplitPayments('tech-1');

      expect(result.totals.totalAmount).toBe(30000);
      expect(result.totals.released).toBe(18000);
      expect(result.totals.pending).toBe(9000);
      expect(result.payments).toHaveLength(2);
    });
  });

  describe('getProviderEarningsSummary', () => {
    it('should return provider earnings summary', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        { providerAmount: 9000, status: 'PENDING' },
        { providerAmount: 18000, status: 'RELEASED' },
      ]);

      const result = await service.getProviderEarningsSummary('tech-1');

      expect(result.totalEarned).toBe(27000);
      expect(result.pending).toBe(9000);
      expect(result.released).toBe(18000);
      expect(result.totalTransactions).toBe(2);
    });
  });
});
