import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SettlementService } from '../settlement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SettlementService', () => {
  let service: SettlementService;
  let prisma: any;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
    },
    splitPayment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    settlement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSettlement', () => {
    it('should generate a settlement', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        {
          id: 'sp-1', totalAmount: 10000, platformFee: 1000, providerAmount: 9000,
          bookingId: 'b-1', booking: { service: { name: 'Cleaning' }, customer: {} },
          status: 'RELEASED',
        },
        {
          id: 'sp-2', totalAmount: 20000, platformFee: 2000, providerAmount: 18000,
          bookingId: 'b-2', booking: { service: { name: 'Plumbing' }, customer: {} },
          status: 'RELEASED',
        },
      ]);
      mockPrisma.settlement.create.mockResolvedValue({
        id: 'settle-1',
        totalEarned: 30000,
        totalFee: 3000,
        netAmount: 27000,
        status: 'PENDING',
        provider: { id: 'tech-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        lineItems: [],
      });
      mockPrisma.splitPayment.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.generateSettlement('tenant-1', 'tech-1', '2026-01-01', '2026-01-31');

      expect(result).toBeDefined();
      expect(result.totalEarned).toBe(30000);
      expect(result.totalFee).toBe(3000);
      expect(result.netAmount).toBe(27000);
      expect(result.status).toBe('PENDING');
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.generateSettlement('tenant-1', 'invalid', '2026-01-01', '2026-01-31'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no unreconciled payments', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
      mockPrisma.splitPayment.findMany.mockResolvedValue([]);

      await expect(service.generateSettlement('tenant-1', 'tech-1', '2026-01-01', '2026-01-31'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsProcessing', () => {
    it('should mark settlement as processing', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settle-1', status: 'PENDING' });
      mockPrisma.settlement.update.mockResolvedValue({ id: 'settle-1', status: 'PROCESSING' });

      const result = await service.markAsProcessing('settle-1');

      expect(result.status).toBe('PROCESSING');
    });

    it('should throw NotFoundException if settlement not found', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);

      await expect(service.markAsProcessing('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not pending', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settle-1', status: 'COMPLETED' });

      await expect(service.markAsProcessing('settle-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsCompleted', () => {
    it('should mark settlement as completed', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settle-1', status: 'PROCESSING' });
      mockPrisma.settlement.update.mockResolvedValue({
        id: 'settle-1', status: 'COMPLETED', paidAt: new Date(), paymentMethod: 'bank', paymentReference: 'ref-1',
      });

      const result = await service.markAsCompleted('settle-1', 'bank', 'ref-1');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethod: 'bank', paymentReference: 'ref-1' }),
        }),
      );
    });

    it('should throw NotFoundException if settlement not found', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);

      await expect(service.markAsCompleted('invalid', 'bank', 'ref-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsFailed', () => {
    it('should mark settlement as failed', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settle-1', status: 'PROCESSING' });
      mockPrisma.settlement.update.mockResolvedValue({ id: 'settle-1', status: 'FAILED', notes: 'Bank error' });

      const result = await service.markAsFailed('settle-1', 'Bank error');

      expect(result.status).toBe('FAILED');
    });

    it('should throw BadRequestException if already completed', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({ id: 'settle-1', status: 'COMPLETED' });

      await expect(service.markAsFailed('settle-1', 'error')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSettlements', () => {
    it('should return settlements with filters', async () => {
      mockPrisma.settlement.findMany.mockResolvedValue([
        { id: 'settle-1', status: 'PENDING', provider: {}, _count: { lineItems: 3 } },
      ]);

      const result = await service.getSettlements('tenant-1', { status: 'PENDING' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', status: 'PENDING' }),
        }),
      );
    });
  });

  describe('getProviderOutstanding', () => {
    it('should return provider outstanding payments', async () => {
      mockPrisma.splitPayment.findMany.mockResolvedValue([
        { providerAmount: 9000, platformFee: 1000, status: 'RELEASED', settledAt: null, booking: {} },
        { providerAmount: 18000, platformFee: 2000, status: 'RELEASED', settledAt: null, booking: {} },
      ]);

      const result = await service.getProviderOutstanding('tenant-1', 'tech-1');

      expect(result.totalOutstanding).toBe(27000);
      expect(result.totalPlatformFee).toBe(3000);
      expect(result.paymentCount).toBe(2);
    });
  });

  describe('getSettlementById', () => {
    it('should return settlement by id', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue({
        id: 'settle-1', provider: {}, lineItems: [],
      });

      const result = await service.getSettlementById('settle-1');

      expect(result.id).toBe('settle-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.settlement.findUnique.mockResolvedValue(null);

      await expect(service.getSettlementById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSettlementSummary', () => {
    it('should return settlement summary', async () => {
      mockPrisma.settlement.findMany.mockResolvedValue([
        { status: 'PENDING', netAmount: 10000 },
        { status: 'PROCESSING', netAmount: 5000 },
        { status: 'COMPLETED', netAmount: 20000 },
        { status: 'FAILED', netAmount: 1000 },
      ]);

      const result = await service.getSettlementSummary('tenant-1');

      expect(result.totalOutstanding).toBe(10000);
      expect(result.totalProcessing).toBe(5000);
      expect(result.totalCompleted).toBe(20000);
      expect(result.totalFailed).toBe(1000);
      expect(result.totalSettlements).toBe(4);
    });
  });
});
