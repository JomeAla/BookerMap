import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationService } from '../location.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LocationService', () => {
  let service: LocationService;
  let prisma: any;

  const mockPrisma = {
    location: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    locationUpdate: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveLocation', () => {
    const locationDto = {
      userId: 'tech-1',
      bookingId: 'booking-1',
      latitude: 6.5244,
      longitude: 3.3792,
      accuracy: 10,
      speed: 0,
      heading: 90,
    };

    it('should save a location update', async () => {
      mockPrisma.locationUpdate.count.mockResolvedValue(5);
      mockPrisma.locationUpdate.create.mockResolvedValue({
        id: 'loc-1',
        ...locationDto,
        tenantId: 'tenant-1',
        timestamp: new Date(),
      });

      const result = await service.saveLocation('tenant-1', locationDto as any);

      expect(result).toBeDefined();
      expect(result.latitude).toBe(6.5244);
      expect(result.longitude).toBe(3.3792);
      expect(mockPrisma.locationUpdate.create).toHaveBeenCalled();
    });

    it('should clean up old locations when over 100 per booking', async () => {
      mockPrisma.locationUpdate.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100);
      mockPrisma.locationUpdate.findFirst.mockResolvedValue({ id: 'old-loc' });
      mockPrisma.locationUpdate.delete.mockResolvedValue({});
      mockPrisma.locationUpdate.create.mockResolvedValue({
        id: 'loc-new',
        ...locationDto,
        tenantId: 'tenant-1',
      });

      const result = await service.saveLocation('tenant-1', locationDto as any);

      expect(result).toBeDefined();
      expect(mockPrisma.locationUpdate.delete).toHaveBeenCalledWith({ where: { id: 'old-loc' } });
    });
  });

  describe('getLatestLocation', () => {
    it('should return the latest location for a user', async () => {
      mockPrisma.locationUpdate.findFirst.mockResolvedValue({
        id: 'loc-1',
        userId: 'tech-1',
        latitude: 6.5244,
        longitude: 3.3792,
        timestamp: new Date(),
      });

      const result = await service.getLatestLocation('tech-1');

      expect(result).toBeDefined();
      expect(result!.userId).toBe('tech-1');
      expect(mockPrisma.locationUpdate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'tech-1' },
          orderBy: { timestamp: 'desc' },
        }),
      );
    });

    it('should return null if no location found', async () => {
      mockPrisma.locationUpdate.findFirst.mockResolvedValue(null);

      const result = await service.getLatestLocation('unknown');

      expect(result).toBeNull();
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history for a booking', async () => {
      mockPrisma.locationUpdate.findMany.mockResolvedValue([
        { id: 'loc-1', latitude: 6.5244, longitude: 3.3792, timestamp: new Date() },
        { id: 'loc-2', latitude: 6.5245, longitude: 3.3793, timestamp: new Date() },
      ]);

      const result = await service.getLocationHistory('booking-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.locationUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookingId: 'booking-1' },
          orderBy: { timestamp: 'asc' },
          take: 100,
        }),
      );
    });
  });

  describe('clearLocationHistory', () => {
    it('should clear location history older than given date', async () => {
      mockPrisma.locationUpdate.deleteMany.mockResolvedValue({ count: 10 });

      const olderThan = new Date('2026-01-01');
      const result = await service.clearLocationHistory(olderThan);

      expect(result.deleted).toBe(10);
      expect(mockPrisma.locationUpdate.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { lt: olderThan } },
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a location', async () => {
      const dto = { name: 'Main Office', address: '123 Street', city: 'Lagos', state: 'LA', country: 'NG' };
      mockPrisma.location.create.mockResolvedValue({ id: 'loc-1', ...dto, tenantId: 'tenant-1' });

      const result = await service.create('tenant-1', dto as any);

      expect(result.id).toBe('loc-1');
    });
  });

  describe('findAll', () => {
    it('should return all tenant locations', async () => {
      mockPrisma.location.findMany.mockResolvedValue([{ id: 'loc-1', name: 'Main Office' }]);

      const result = await service.findAll('tenant-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return a location by id', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'tenant-1' });

      const result = await service.findById('tenant-1', 'loc-1');

      expect(result.id).toBe('loc-1');
    });

    it('should throw NotFoundException if location not found', async () => {
      mockPrisma.location.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a location', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'tenant-1' });
      mockPrisma.location.update.mockResolvedValue({ id: 'loc-1', name: 'Updated Office' });

      const result = await service.update('tenant-1', 'loc-1', { name: 'Updated Office' } as any);

      expect(result.name).toBe('Updated Office');
    });
  });

  describe('remove', () => {
    it('should delete a location', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'tenant-1' });
      mockPrisma.location.delete.mockResolvedValue({ id: 'loc-1' });

      const result = await service.remove('tenant-1', 'loc-1');

      expect(result.id).toBe('loc-1');
    });
  });
});
