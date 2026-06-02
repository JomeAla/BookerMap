import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DomainService } from '../domain.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DomainService', () => {
  let service: DomainService;
  let prisma: any;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DomainService>(DomainService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addDomain', () => {
    it('should add a domain to tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.bookermap.com',
        domainVerified: false,
        domainVerificationToken: expect.any(String),
      });

      const result = await service.addDomain('tenant-1', 'Example.BookerMap.com');

      expect(result.customDomain).toBe('example.bookermap.com');
      expect(result.domainVerified).toBe(false);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({
            customDomain: 'example.bookermap.com',
            domainVerified: false,
          }),
        }),
      );
    });

    it('should throw ConflictException if domain already in use', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'other-tenant', customDomain: 'example.com' });

      await expect(service.addDomain('tenant-1', 'example.com')).rejects.toThrow(ConflictException);
    });

    it('should allow re-adding own domain', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', customDomain: 'example.com' });
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.com',
        domainVerified: false,
        domainVerificationToken: 'new-token',
      });

      const result = await service.addDomain('tenant-1', 'example.com');

      expect(result.customDomain).toBe('example.com');
    });
  });

  describe('verifyDomain', () => {
    it('should verify domain with force flag', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.com',
        domainVerificationToken: 'token-123',
      });
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.com',
        domainVerified: true,
        domainVerifiedAt: new Date(),
      });

      const result = await service.verifyDomain('tenant-1', true);

      expect(result.domainVerified).toBe(true);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.verifyDomain('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no custom domain configured', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customDomain: null,
      });

      await expect(service.verifyDomain('tenant-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no verification token', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.com',
        domainVerificationToken: null,
      });

      await expect(service.verifyDomain('tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeDomain', () => {
    it('should remove a domain from tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customDomain: 'example.com',
      });
      mockPrisma.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        customDomain: null,
        domainVerified: false,
      });

      const result = await service.removeDomain('tenant-1');

      expect(result.customDomain).toBeNull();
      expect(result.domainVerified).toBe(false);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.removeDomain('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no custom domain configured', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        customDomain: null,
      });

      await expect(service.removeDomain('tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveTenantFromDomain', () => {
    it('should resolve tenant from domain', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Test Business',
        slug: 'test-business',
        customDomain: 'test.bookermap.com',
        domainVerified: true,
      });

      const result = await service.resolveTenantFromDomain('test.bookermap.com');

      expect(result).toBeDefined();
      expect(result.id).toBe('tenant-1');
    });

    it('should return null if no tenant found for domain', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.resolveTenantFromDomain('unknown.com');

      expect(result).toBeNull();
    });
  });

  describe('getDomainConfig', () => {
    it('should return domain configuration', () => {
      const tenant = {
        id: 'tenant-1',
        customDomain: 'example.com',
        domainVerificationToken: 'verify-token',
      };

      const result = service.getDomainConfig(tenant);

      expect(result.domain).toBe('example.com');
      expect(result.cnameRecord.value).toBe('bookermap.app');
      expect(result.txtRecord.value).toBe('verify-token');
      expect(result.verificationStatus).toBe('pending');
    });

    it('should return not_configured status when no domain', () => {
      const tenant = {
        id: 'tenant-1',
        customDomain: null,
        domainVerificationToken: null,
      };

      const result = service.getDomainConfig(tenant);

      expect(result.verificationStatus).toBe('not_configured');
    });
  });
});
