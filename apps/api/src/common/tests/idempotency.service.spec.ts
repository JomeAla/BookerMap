import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from '../idempotency.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let prisma: any;

  const mockPrisma = {
    idempotencyKey: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCached', () => {
    it('should return cached data on hit', async () => {
      const future = new Date(Date.now() + 3600000);
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
        key: 'test-key',
        response: { id: 'booking-1' },
        statusCode: 200,
        expiresAt: future,
        requestHash: null,
      });

      const result = await service.getCached('test-key');

      expect(result).toBeDefined();
      expect(result!.data).toEqual({ id: 'booking-1' });
      expect(result!.statusCode).toBe(200);
    });

    it('should return null on miss', async () => {
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue(null);

      const result = await service.getCached('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete and return null if expired', async () => {
      const past = new Date(Date.now() - 3600000);
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
        key: 'expired-key',
        response: {},
        statusCode: 200,
        expiresAt: past,
        requestHash: null,
      });
      mockPrisma.idempotencyKey.delete.mockResolvedValue({});

      const result = await service.getCached('expired-key');

      expect(result).toBeNull();
      expect(mockPrisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { key: 'expired-key' } });
    });

    it('should return conflict if requestHash does not match', async () => {
      const future = new Date(Date.now() + 3600000);
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
        key: 'test-key',
        response: { id: 'booking-1' },
        statusCode: 200,
        expiresAt: future,
        requestHash: 'hash1',
      });

      const result = await service.getCached('test-key', 'hash2');

      expect(result).toEqual({ conflict: true });
    });

    it('should not return conflict if both requestHashes are null', async () => {
      const future = new Date(Date.now() + 3600000);
      mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
        key: 'test-key',
        response: { id: 'booking-1' },
        statusCode: 200,
        expiresAt: future,
        requestHash: null,
      });

      const result = await service.getCached('test-key');

      expect(result!.conflict).toBeUndefined();
    });
  });

  describe('cache', () => {
    it('should store and retrieve cached data', async () => {
      const response = { id: 'booking-1', status: 'PENDING' };
      mockPrisma.idempotencyKey.upsert.mockResolvedValue({
        key: 'new-key',
        response,
        statusCode: 201,
        expiresAt: new Date(Date.now() + 3600000),
        requestHash: 'hash',
      });

      await service.cache('new-key', response, 201, 60, 'hash');

      expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'new-key' },
          create: expect.objectContaining({ key: 'new-key', response, statusCode: 201 }),
          update: expect.objectContaining({ response, statusCode: 201 }),
        }),
      );
    });

    it('should use defaults for statusCode and ttl', async () => {
      mockPrisma.idempotencyKey.upsert.mockResolvedValue({});

      await service.cache('key', { data: 'test' });

      expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ statusCode: 200 }),
        }),
      );
    });
  });
});
