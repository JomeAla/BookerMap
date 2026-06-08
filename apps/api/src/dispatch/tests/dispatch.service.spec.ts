import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DispatchService } from '../dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoAssignmentService } from '../auto-assignment.service';
import { BookingGateway } from '../../gateway/booking.gateway';

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: any;
  let autoAssignmentService: any;
  let bookingGateway: any;

  const mockPrisma = {
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    dispatch: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const mockAutoAssignmentService = {
    findBestTechnician: jest.fn(),
  };

  const mockBookingGateway = {
    notifyTechnician: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AutoAssignmentService, useValue: mockAutoAssignmentService },
        { provide: BookingGateway, useValue: mockBookingGateway },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
    prisma = module.get(PrismaService);
    autoAssignmentService = module.get(AutoAssignmentService);
    bookingGateway = module.get(BookingGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { bookingId: 'booking-1', assignedToId: 'tech-1' };

    it('should create a dispatch successfully', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.create.mockResolvedValue({
        id: 'dispatch-1',
        bookingId: 'booking-1',
        assignedToId: 'tech-1',
        status: 'ASSIGNED',
        booking: { customer: {}, service: {} },
        assignedTo: {},
      });

      const result = await service.create('tenant-1', dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('dispatch-1');
      expect(result.status).toBe('ASSIGNED');
      expect(mockPrisma.dispatch.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dispatch already exists', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.findUnique.mockResolvedValue({ id: 'existing-dispatch' });

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if technician not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.create('tenant-1', dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('offerJob', () => {
    it('should offer a job to technicians', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);
      mockPrisma.dispatch.create.mockResolvedValue({
        id: 'dispatch-1',
        status: 'OFFERED',
        offeredAt: new Date(),
        booking: { customer: {}, service: {} },
        assignedTo: null,
      });

      const result = await service.offerJob('tenant-1', 'booking-1', ['tech-1', 'tech-2']);

      expect(result).toBeDefined();
      expect(result.status).toBe('OFFERED');
      expect(mockPrisma.dispatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OFFERED' }),
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.offerJob('tenant-1', 'booking-1', ['tech-1'])).rejects.toThrow(NotFoundException);
    });

    it('should update existing dispatch to offered status', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispatch.findUnique.mockResolvedValue({ id: 'existing-dispatch', status: 'ASSIGNED' });
      mockPrisma.dispatch.update.mockResolvedValue({
        id: 'existing-dispatch',
        status: 'OFFERED',
        offeredAt: new Date(),
        booking: { customer: {}, service: {} },
        assignedTo: null,
      });

      const result = await service.offerJob('tenant-1', 'booking-1', ['tech-1']);

      expect(result.status).toBe('OFFERED');
      expect(mockPrisma.dispatch.update).toHaveBeenCalled();
    });
  });

  describe('acceptJob', () => {
    it('should accept a job', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1',
        status: 'OFFERED',
        booking: { customer: {}, service: {} },
        assignedTo: null,
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1', role: 'TECHNICIAN' });
      mockPrisma.dispatch.update.mockResolvedValue({
        id: 'dispatch-1',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        assignedToId: 'tech-1',
        booking: { customer: {}, service: {} },
        assignedTo: { id: 'tech-1' },
      });

      const result = await service.acceptJob('tenant-1', 'dispatch-1', 'tech-1');

      expect(result.status).toBe('ACCEPTED');
      expect(result.assignedToId).toBe('tech-1');
    });

    it('should throw NotFoundException if dispatch not found', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue(null);

      await expect(service.acceptJob('tenant-1', 'invalid', 'tech-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if technician not found', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1',
        status: 'OFFERED',
        booking: { customer: {}, service: {} },
        assignedTo: null,
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.acceptJob('tenant-1', 'dispatch-1', 'tech-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if job is not offered', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1',
        status: 'ASSIGNED',
        booking: { customer: {}, service: {} },
        assignedTo: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-1', tenantId: 'tenant-1', role: 'TECHNICIAN' });

      await expect(service.acceptJob('tenant-1', 'dispatch-1', 'tech-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableJobs', () => {
    it('should return all offered jobs', async () => {
      mockPrisma.dispatch.findMany.mockResolvedValue([
        { id: 'd1', status: 'OFFERED', offeredAt: new Date(), booking: { customer: {}, service: {} }, assignedTo: null },
      ]);

      const result = await service.getAvailableJobs('tenant-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.dispatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ booking: { tenantId: 'tenant-1' }, status: 'OFFERED' }),
        }),
      );
    });

    it('should filter by technicianId', async () => {
      mockPrisma.dispatch.findMany.mockResolvedValue([]);

      const result = await service.getAvailableJobs('tenant-1', 'tech-1');

      expect(result).toEqual([]);
    });
  });

  describe('autoAssign', () => {
    it('should auto-assign a technician', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1', tenantId: 'tenant-1', serviceId: 'svc-1', startTime: new Date(), technicianId: null,
      });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);
      mockAutoAssignmentService.findBestTechnician.mockResolvedValue('tech-1');
      mockPrisma.dispatch.create.mockResolvedValue({
        id: 'dispatch-1', status: 'ASSIGNED', assignedToId: 'tech-1',
        booking: { customer: {}, service: {} }, assignedTo: {},
      });

      const result = await service.autoAssign('booking-1');

      expect(result).toBeDefined();
      expect(result!.status).toBe('ASSIGNED');
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.autoAssign('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return existing dispatch if already exists', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1', tenantId: 'tenant-1', serviceId: 'svc-1', startTime: new Date(), technicianId: null,
      });
      mockPrisma.dispatch.findUnique.mockResolvedValue({ id: 'existing-dispatch' });

      const result = await service.autoAssign('booking-1');

      expect(result!.id).toBe('existing-dispatch');
      expect(mockPrisma.dispatch.create).not.toHaveBeenCalled();
    });

    it('should return null if no technician found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1', tenantId: 'tenant-1', serviceId: 'svc-1', startTime: new Date(), technicianId: null,
      });
      mockPrisma.dispatch.findUnique.mockResolvedValue(null);
      mockAutoAssignmentService.findBestTechnician.mockResolvedValue(null);

      const result = await service.autoAssign('booking-1');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all dispatches for tenant', async () => {
      mockPrisma.dispatch.findMany.mockResolvedValue([
        { id: 'd1', booking: { customer: {}, service: {} }, assignedTo: {} },
      ]);

      const result = await service.findAll('tenant-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return a dispatch by id', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1', booking: { customer: {}, service: {} }, assignedTo: {},
      });

      const result = await service.findById('tenant-1', 'dispatch-1');

      expect(result.id).toBe('dispatch-1');
    });

    it('should throw NotFoundException if dispatch not found', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update dispatch status', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1', booking: { customer: {}, service: {} }, assignedTo: {},
      });
      mockPrisma.dispatch.update.mockResolvedValue({
        id: 'dispatch-1', status: 'STARTED', startedAt: new Date(),
        booking: { customer: {}, service: {} }, assignedTo: {},
      });

      const result = await service.updateStatus('tenant-1', 'dispatch-1', 'STARTED' as any);

      expect(result.status).toBe('STARTED');
    });

    it('should set completedAt when status is COMPLETED', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1', booking: { customer: {}, service: {} }, assignedTo: {},
      });
      mockPrisma.dispatch.update.mockResolvedValue({
        id: 'dispatch-1', status: 'COMPLETED', completedAt: new Date(),
        booking: { customer: {}, service: {} }, assignedTo: {},
      });

      const result = await service.updateStatus('tenant-1', 'dispatch-1', 'COMPLETED' as any);

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('assignTechnician', () => {
    it('should reassign technician', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1', booking: { customer: {}, service: {} }, assignedTo: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'tech-2', tenantId: 'tenant-1' });
      mockPrisma.dispatch.update.mockResolvedValue({
        id: 'dispatch-1', assignedToId: 'tech-2',
        booking: { customer: {}, service: {} }, assignedTo: {},
      });

      const result = await service.assignTechnician('tenant-1', 'dispatch-1', 'tech-2');

      expect(result.assignedToId).toBe('tech-2');
    });

    it('should throw NotFoundException if technician not found', async () => {
      mockPrisma.dispatch.findFirst.mockResolvedValue({
        id: 'dispatch-1', booking: { customer: {}, service: {} }, assignedTo: {},
      });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.assignTechnician('tenant-1', 'dispatch-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
