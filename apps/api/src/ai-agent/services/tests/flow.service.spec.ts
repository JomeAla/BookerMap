import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FlowService } from '../flow.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('FlowService', () => {
  let service: FlowService;
  let prisma: any;

  const mockPrisma = {
    conversationFlow: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FlowService>(FlowService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFlow', () => {
    it('should create a flow', async () => {
      const dto = {
        name: 'Welcome Flow',
        description: 'Greets new customers',
        trigger: 'INTENT_KEYWORD',
        triggerValue: 'hello',
        nodes: [{ id: '1', nodeType: 'START' }],
        edges: [],
        isActive: true,
      };

      mockPrisma.conversationFlow.create.mockResolvedValue({
        id: 'flow-1',
        ...dto,
        tenantId: 'tenant-1',
      });

      const result = await service.createFlow('tenant-1', dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('flow-1');
      expect(mockPrisma.conversationFlow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Welcome Flow' }),
        }),
      );
    });
  });

  describe('updateFlow', () => {
    it('should update a flow', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1', tenantId: 'tenant-1',
      });
      mockPrisma.conversationFlow.update.mockResolvedValue({
        id: 'flow-1',
        name: 'Updated Flow',
        version: 2,
      });

      const result = await service.updateFlow('flow-1', 'tenant-1', { name: 'Updated Flow' });

      expect(result.name).toBe('Updated Flow');
      expect(mockPrisma.conversationFlow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'flow-1' },
          data: expect.objectContaining({ name: 'Updated Flow', version: { increment: 1 } }),
        }),
      );
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue(null);

      await expect(service.updateFlow('invalid', 'tenant-1', { name: 'test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateFlow', () => {
    it('should activate a flow', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1', tenantId: 'tenant-1', isActive: false,
      });
      mockPrisma.conversationFlow.update.mockResolvedValue({
        id: 'flow-1', isActive: true,
      });

      const result = await service.activateFlow('flow-1', 'tenant-1');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue(null);

      await expect(service.activateFlow('invalid', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateFlow', () => {
    it('should deactivate a flow', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1', tenantId: 'tenant-1', isActive: true,
      });
      mockPrisma.conversationFlow.update.mockResolvedValue({
        id: 'flow-1', isActive: false,
      });

      const result = await service.deactivateFlow('flow-1', 'tenant-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('executeFlow', () => {
    it('should execute an active flow', async () => {
      mockPrisma.conversationFlow.findUnique.mockResolvedValue({
        id: 'flow-1',
        isActive: true,
        nodes: [
          { id: 'node-1', nodeType: 'START' },
          { id: 'node-2', nodeType: 'MESSAGE', data: { content: 'Hello {{name}}!' } },
          { id: 'node-3', nodeType: 'END' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2' },
          { source: 'node-2', target: 'node-3' },
        ],
      });

      const result = await service.executeFlow('flow-1', { message: 'hi', entities: { name: 'John' } });

      expect(result.executed).toBe(true);
      expect(result.reply).toBe('Hello John!');
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findUnique.mockResolvedValue(null);

      await expect(service.executeFlow('invalid', { message: 'hi' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if flow is not active', async () => {
      mockPrisma.conversationFlow.findUnique.mockResolvedValue({
        id: 'flow-1',
        isActive: false,
        nodes: [],
        edges: [],
      });

      await expect(service.executeFlow('flow-1', { message: 'hi' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMatchingFlow', () => {
    it('should find a matching flow by INTENT_KEYWORD', async () => {
      mockPrisma.conversationFlow.findMany.mockResolvedValue([
        {
          id: 'flow-1',
          isActive: true,
          trigger: 'INTENT_KEYWORD',
          triggerValue: 'refund',
          nodes: [
            { id: 'n1', nodeType: 'START' },
            { id: 'n2', nodeType: 'MESSAGE', data: { content: 'I can help with refunds.' } },
            { id: 'n3', nodeType: 'END' },
          ],
          edges: [
            { source: 'n1', target: 'n2' },
            { source: 'n2', target: 'n3' },
          ],
        },
      ]);

      const result = await service.findMatchingFlow('tenant-1', { message: 'I want a refund please' });

      expect(result).toBeDefined();
      expect(result.executed).toBe(true);
      expect(result.reply).toContain('refunds');
    });

    it('should return null if no flow matches', async () => {
      mockPrisma.conversationFlow.findMany.mockResolvedValue([
        {
          id: 'flow-1',
          isActive: true,
          trigger: 'INTENT_KEYWORD',
          triggerValue: 'cancel',
          nodes: [],
          edges: [],
        },
      ]);

      const result = await service.findMatchingFlow('tenant-1', { message: 'I want a refund' });

      expect(result).toBeNull();
    });

    it('should match by EXACT_MATCH trigger', async () => {
      mockPrisma.conversationFlow.findMany.mockResolvedValue([
        {
          id: 'flow-1',
          isActive: true,
          trigger: 'EXACT_MATCH',
          triggerValue: 'help',
          nodes: [
            { id: 'n1', nodeType: 'START' },
            { id: 'n2', nodeType: 'MESSAGE', data: { content: 'How can I help?' } },
            { id: 'n3', nodeType: 'END' },
          ],
          edges: [
            { source: 'n1', target: 'n2' },
            { source: 'n2', target: 'n3' },
          ],
        },
      ]);

      const result = await service.findMatchingFlow('tenant-1', { message: 'help' });

      expect(result).toBeDefined();
      expect(result.executed).toBe(true);
    });

    it('should match by BOOKING_STATUS trigger', async () => {
      mockPrisma.conversationFlow.findMany.mockResolvedValue([
        {
          id: 'flow-1',
          isActive: true,
          trigger: 'BOOKING_STATUS',
          triggerValue: 'pending',
          nodes: [
            { id: 'n1', nodeType: 'START' },
            { id: 'n2', nodeType: 'MESSAGE', data: { content: 'Your booking is pending.' } },
            { id: 'n3', nodeType: 'END' },
          ],
          edges: [
            { source: 'n1', target: 'n2' },
            { source: 'n2', target: 'n3' },
          ],
        },
      ]);

      const result = await service.findMatchingFlow('tenant-1', { message: '', bookingStatus: 'PENDING' });

      expect(result).toBeDefined();
      expect(result.executed).toBe(true);
    });
  });

  describe('deleteFlow', () => {
    it('should delete a flow', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1', tenantId: 'tenant-1',
      });
      mockPrisma.conversationFlow.delete.mockResolvedValue({});

      const result = await service.deleteFlow('flow-1', 'tenant-1');

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue(null);

      await expect(service.deleteFlow('invalid', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFlows', () => {
    it('should return all tenant flows', async () => {
      mockPrisma.conversationFlow.findMany.mockResolvedValue([
        { id: 'flow-1', name: 'Flow 1' },
      ]);

      const result = await service.getFlows('tenant-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getFlow', () => {
    it('should return a flow by id', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1', tenantId: 'tenant-1',
      });

      const result = await service.getFlow('flow-1', 'tenant-1');

      expect(result.id).toBe('flow-1');
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue(null);

      await expect(service.getFlow('invalid', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicateFlow', () => {
    it('should duplicate a flow with (Copy) suffix', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1',
        tenantId: 'tenant-1',
        name: 'Welcome Flow',
        description: 'Greets customers',
        trigger: 'INTENT_KEYWORD',
        triggerValue: 'hello',
        nodes: [],
        edges: [],
      });
      mockPrisma.conversationFlow.create.mockResolvedValue({
        id: 'flow-2',
        name: 'Welcome Flow (Copy)',
        isActive: false,
      });

      const result = await service.duplicateFlow('flow-1', 'tenant-1');

      expect(result.name).toBe('Welcome Flow (Copy)');
      expect(result.isActive).toBe(false);
    });
  });

  describe('testFlow', () => {
    it('should test a flow with given context', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue({
        id: 'flow-1',
        tenantId: 'tenant-1',
        nodes: [
          { id: 'n1', nodeType: 'START' },
          { id: 'n2', nodeType: 'MESSAGE', data: { content: 'Test reply' } },
          { id: 'n3', nodeType: 'END' },
        ],
        edges: [
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
        ],
      });

      const result = await service.testFlow('flow-1', 'tenant-1', { message: 'test' });

      expect(result.executed).toBe(true);
      expect(result.reply).toBe('Test reply');
    });

    it('should throw NotFoundException if flow not found', async () => {
      mockPrisma.conversationFlow.findFirst.mockResolvedValue(null);

      await expect(service.testFlow('invalid', 'tenant-1', { message: 'test' })).rejects.toThrow(NotFoundException);
    });
  });
});
