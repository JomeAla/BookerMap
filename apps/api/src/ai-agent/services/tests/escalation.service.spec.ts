import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EscalationService } from '../escalation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../../notification/notification.service';

describe('EscalationService', () => {
  let service: EscalationService;
  let prisma: any;
  let notificationService: any;

  const mockPrisma = {
    escalation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    aiMessage: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendInApp: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('escalate', () => {
    it('should create an escalation', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue(null);
      mockPrisma.escalation.create.mockResolvedValue({
        id: 'esc-1',
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        priority: 'NORMAL',
        status: 'OPEN',
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.escalate('conv-1', 'tenant-1', 'cust-1', 'Need human agent', 'NORMAL' as any);

      expect(result).toBeDefined();
      expect(result.status).toBe('OPEN');
      expect(mockNotificationService.sendInApp).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already escalated', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({ id: 'existing-esc' });

      await expect(service.escalate('conv-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    it('should assign escalation to agent', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({
        id: 'esc-1',
        status: 'OPEN',
      });
      mockPrisma.escalation.update.mockResolvedValue({
        id: 'esc-1',
        assignedToId: 'agent-1',
        status: 'ASSIGNED',
      });

      const result = await service.assign('esc-1', 'agent-1');

      expect(result.status).toBe('ASSIGNED');
      expect(result.assignedToId).toBe('agent-1');
    });

    it('should throw NotFoundException if escalation not found', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue(null);

      await expect(service.assign('invalid', 'agent-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already resolved', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({
        id: 'esc-1',
        status: 'RESOLVED',
      });

      await expect(service.assign('esc-1', 'agent-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already closed', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({
        id: 'esc-1',
        status: 'CLOSED',
      });

      await expect(service.assign('esc-1', 'agent-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolve', () => {
    it('should resolve an escalation', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({
        id: 'esc-1',
        status: 'ASSIGNED',
      });
      mockPrisma.escalation.update.mockResolvedValue({
        id: 'esc-1',
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: 'Issue resolved via phone',
      });

      const result = await service.resolve('esc-1', 'Issue resolved via phone');

      expect(result.status).toBe('RESOLVED');
    });

    it('should throw NotFoundException if escalation not found', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue(null);

      await expect(service.resolve('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOpenEscalations', () => {
    it('should return open escalations with pagination', async () => {
      mockPrisma.escalation.findMany.mockResolvedValue([
        { id: 'esc-1', status: 'OPEN', customer: {}, assignedTo: {} },
      ]);
      mockPrisma.escalation.count.mockResolvedValue(1);

      const result = await service.getOpenEscalations('tenant-1');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.escalation.findMany.mockResolvedValue([]);
      mockPrisma.escalation.count.mockResolvedValue(0);

      const result = await service.getOpenEscalations('tenant-1', 'ASSIGNED' as any);

      expect(mockPrisma.escalation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', status: 'ASSIGNED' }),
        }),
      );
    });
  });

  describe('getMyEscalations', () => {
    it('should return escalations assigned to agent', async () => {
      mockPrisma.escalation.findMany.mockResolvedValue([
        { id: 'esc-1', assignedToId: 'agent-1', customer: {} },
      ]);

      const result = await service.getMyEscalations('agent-1', 'tenant-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getOpenCount', () => {
    it('should return count of open escalations', async () => {
      mockPrisma.escalation.count.mockResolvedValue(3);

      const result = await service.getOpenCount('tenant-1');

      expect(result).toBe(3);
    });
  });

  describe('getEscalationWithConversation', () => {
    it('should return escalation with messages', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue({
        id: 'esc-1',
        conversationId: 'conv-1',
        customer: {},
        assignedTo: {},
      });
      mockPrisma.aiMessage.findMany.mockResolvedValue([{ id: 'msg-1', content: 'Hello' }]);

      const result = await service.getEscalationWithConversation('esc-1');

      expect(result.messages).toHaveLength(1);
    });

    it('should throw NotFoundException if escalation not found', async () => {
      mockPrisma.escalation.findUnique.mockResolvedValue(null);

      await expect(service.getEscalationWithConversation('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
