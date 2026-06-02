import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: any;

  const mockPrisma = {
    apiKey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateKey', () => {
    it('should generate an API key', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'Test Key',
        key: 'hashed-value',
        keyPrefix: 'bmap_abc123',
        scopes: ['bookings:read'],
        rateLimit: 100,
        isActive: true,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.generateKey('tenant-1', 'Test Key', ['bookings:read'], 100);

      expect(result.rawKey).toBeDefined();
      expect(result.rawKey.startsWith('bmap_')).toBe(true);
      expect(result.apiKey.name).toBe('Test Key');
      expect(result.apiKey.key).toBeUndefined();
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            name: 'Test Key',
            scopes: ['bookings:read'],
          }),
        }),
      );
    });

    it('should use default rate limit if not provided', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'Default Key',
        key: 'hash',
        keyPrefix: 'bmap_',
        scopes: [],
        rateLimit: 100,
        isActive: true,
      });

      const result = await service.generateKey('tenant-1', 'Default Key', []);

      expect(result.apiKey.rateLimit).toBe(100);
    });
  });

  describe('validateKey', () => {
    it('should validate a valid API key', async () => {
      const future = new Date(Date.now() + 86400000);
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'some-hash',
        isActive: true,
        expiresAt: future,
        scopes: ['bookings:read'],
        rateLimit: 100,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await service.validateKey('bmap_validkey123');

      expect(result).toBeDefined();
      expect(result.id).toBe('key-1');
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-1' },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException for invalid key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.validateKey('bmap_invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if key is deactivated', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'hash',
        isActive: false,
        expiresAt: null,
      });

      await expect(service.validateKey('bmap_deactivated')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if key is expired', async () => {
      const past = new Date(Date.now() - 86400000);
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'hash',
        isActive: true,
        expiresAt: past,
      });

      await expect(service.validateKey('bmap_expired')).rejects.toThrow(BadRequestException);
    });

    it('should validate key without expiry', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'hash',
        isActive: true,
        expiresAt: null,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await service.validateKey('bmap_noexpiry');

      expect(result).toBeDefined();
    });
  });

  describe('revokeKey', () => {
    it('should revoke an API key', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-1' });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        isActive: false,
      });

      const result = await service.revokeKey('tenant-1', 'key-1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-1' },
          data: { isActive: false },
        }),
      );
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.revokeKey('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listKeys', () => {
    it('should list all keys for a tenant', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'Key 1', keyPrefix: 'bmap_abc', scopes: ['read'], rateLimit: 100, isActive: true, lastUsedAt: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'key-2', name: 'Key 2', keyPrefix: 'bmap_def', scopes: ['write'], rateLimit: 50, isActive: false, lastUsedAt: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await service.listKeys('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('key');
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
    });
  });

  describe('getKeyInfo', () => {
    it('should return key info', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key-1', tenantId: 'tenant-1', name: 'Test Key',
        keyPrefix: 'bmap_abc', scopes: ['read'], rateLimit: 100,
        isActive: true, lastUsedAt: null, expiresAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.getKeyInfo('tenant-1', 'key-1');

      expect(result.id).toBe('key-1');
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.getKeyInfo('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateScopes', () => {
    it('should update key scopes', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'key-1', tenantId: 'tenant-1' });
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        scopes: ['bookings:write', 'customers:read'],
      });

      const result = await service.updateScopes('tenant-1', 'key-1', ['bookings:write', 'customers:read']);

      expect(result.scopes).toEqual(['bookings:write', 'customers:read']);
    });

    it('should throw NotFoundException if key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.updateScopes('tenant-1', 'invalid', [])).rejects.toThrow(NotFoundException);
    });
  });
});
