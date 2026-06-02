import { Test, TestingModule } from '@nestjs/testing';
import { SatisfactionService } from '../satisfaction.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SatisfactionService', () => {
  let service: SatisfactionService;
  let prisma: any;

  const mockPrisma = {
    satisfactionSurvey: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    nPSResponse: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatisfactionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SatisfactionService>(SatisfactionService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordSurvey', () => {
    it('should record a CSAT survey', async () => {
      mockPrisma.satisfactionSurvey.create.mockResolvedValue({
        id: 'survey-1',
        tenantId: 'tenant-1',
        score: 4,
        scoreType: 'CSAT',
        touchpoint: 'post-service',
        feedback: 'Great job!',
        booking: { service: { name: 'Cleaning' } },
        customer: { id: 'cust-1' },
      });

      const result = await service.recordSurvey('tenant-1', {
        bookingId: 'booking-1',
        customerId: 'cust-1',
        touchpoint: 'post-service',
        score: 4,
        feedback: 'Great job!',
      });

      expect(result.score).toBe(4);
      expect(result.scoreType).toBe('CSAT');
    });

    it('should record survey with default scoreType', async () => {
      mockPrisma.satisfactionSurvey.create.mockResolvedValue({
        id: 'survey-1',
        score: 5,
        scoreType: 'CSAT',
        touchpoint: 'booking',
        booking: null,
        customer: {},
      });

      const result = await service.recordSurvey('tenant-1', {
        customerId: 'cust-1',
        touchpoint: 'booking',
        score: 5,
      });

      expect(result.scoreType).toBe('CSAT');
    });
  });

  describe('recordNPS', () => {
    it('should record NPS with promoter type', async () => {
      mockPrisma.nPSResponse.create.mockResolvedValue({
        id: 'nps-1',
        score: 9,
        promoterType: 'PROMOTER',
        customer: {},
      });

      const result = await service.recordNPS('tenant-1', 'cust-1', 9);

      expect(result.promoterType).toBe('PROMOTER');
    });

    it('should record NPS with detractor type', async () => {
      mockPrisma.nPSResponse.create.mockResolvedValue({
        id: 'nps-2',
        score: 4,
        promoterType: 'DETRACTOR',
        customer: {},
      });

      const result = await service.recordNPS('tenant-1', 'cust-1', 4);

      expect(result.promoterType).toBe('DETRACTOR');
    });

    it('should record NPS with passive type', async () => {
      mockPrisma.nPSResponse.create.mockResolvedValue({
        id: 'nps-3',
        score: 8,
        promoterType: 'PASSIVE',
        customer: {},
      });

      const result = await service.recordNPS('tenant-1', 'cust-1', 8);

      expect(result.promoterType).toBe('PASSIVE');
    });
  });

  describe('getCSATScore', () => {
    it('should calculate CSAT average score', async () => {
      mockPrisma.satisfactionSurvey.findMany.mockResolvedValue([
        { score: 5 },
        { score: 4 },
        { score: 3 },
      ]);

      const result = await service.getCSATScore('tenant-1');

      expect(result.average).toBe(4);
      expect(result.count).toBe(3);
      expect(result.total).toBe(12);
    });

    it('should return 0 when no surveys', async () => {
      mockPrisma.satisfactionSurvey.findMany.mockResolvedValue([]);

      const result = await service.getCSATScore('tenant-1');

      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getNPSScore', () => {
    it('should calculate NPS score (promoters - detractors)', async () => {
      mockPrisma.nPSResponse.findMany.mockResolvedValue([
        { promoterType: 'PROMOTER' },
        { promoterType: 'PROMOTER' },
        { promoterType: 'PASSIVE' },
        { promoterType: 'DETRACTOR' },
        { promoterType: 'DETRACTOR' },
      ]);

      const result = await service.getNPSScore('tenant-1');

      expect(result.nps).toBe(0);
      expect(result.promoters).toBe(2);
      expect(result.passives).toBe(1);
      expect(result.detractors).toBe(2);
      expect(result.total).toBe(5);
    });

    it('should calculate positive NPS score', async () => {
      mockPrisma.nPSResponse.findMany.mockResolvedValue([
        { promoterType: 'PROMOTER' },
        { promoterType: 'PROMOTER' },
        { promoterType: 'PROMOTER' },
        { promoterType: 'DETRACTOR' },
      ]);

      const result = await service.getNPSScore('tenant-1');

      expect(result.nps).toBe(50);
      expect(result.promoters).toBe(3);
      expect(result.detractors).toBe(1);
    });

    it('should return 0 when no NPS responses', async () => {
      mockPrisma.nPSResponse.findMany.mockResolvedValue([]);

      const result = await service.getNPSScore('tenant-1');

      expect(result.nps).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return surveys with filters', async () => {
      mockPrisma.satisfactionSurvey.findMany.mockResolvedValue([
        { id: 's-1', score: 5, customer: {}, booking: { service: {} } },
      ]);

      const result = await service.findAll('tenant-1', { touchpoint: 'post-service' });

      expect(result).toHaveLength(1);
    });
  });

  describe('getSatisfactionTrend', () => {
    it('should return monthly trend', async () => {
      mockPrisma.satisfactionSurvey.findMany.mockResolvedValue([
        { score: 5, respondedAt: new Date('2026-01-15'), scoreType: 'CSAT' },
        { score: 4, respondedAt: new Date('2026-01-20'), scoreType: 'CSAT' },
        { score: 3, respondedAt: new Date('2026-02-10'), scoreType: 'CSAT' },
      ]);

      const result = await service.getSatisfactionTrend('tenant-1', 6);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCustomerSatisfaction', () => {
    it('should return customer surveys and NPS responses', async () => {
      mockPrisma.satisfactionSurvey.findMany.mockResolvedValue([]);
      mockPrisma.nPSResponse.findMany.mockResolvedValue([]);

      const result = await service.getCustomerSatisfaction('cust-1', 'tenant-1');

      expect(result.surveys).toEqual([]);
      expect(result.npsResponses).toEqual([]);
    });
  });
});
