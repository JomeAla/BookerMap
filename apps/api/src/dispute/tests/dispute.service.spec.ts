import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DisputeService } from '../dispute.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { PaymentService } from '../../payment/payment.service';
import { NotificationService } from '../../notification/notification.service';

describe('DisputeService', () => {
  let service: DisputeService;
  let prisma: any;
  let webhookService: any;
  let paymentService: any;
  let notificationService: any;

  const mockPrisma = {
    booking: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn() },
    dispute: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    disputeEvidence: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };

  const mockWebhookService = {
    dispatchEvent: jest.fn().mockResolvedValue(true),
  };

  const mockPaymentService = {
    refundPayment: jest.fn().mockResolvedValue({ status: 'success' }),
  };

  const mockNotificationService = {
    sendInApp: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
    prisma = module.get(PrismaService);
    webhookService = module.get(WebhookService);
    paymentService = module.get(PaymentService);
    notificationService = module.get(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDispute', () => {
    const dto = {
      customerId: 'cust-1',
      type: 'SERVICE_ISSUE',
      description: 'Poor service quality',
      amount: 5000,
      bookingId: 'booking-1',
    };

    it('should create a dispute', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.dispute.create.mockResolvedValue({
        id: 'dispute-1',
        type: 'SERVICE_ISSUE',
        description: 'Poor service quality',
        amount: 5000,
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        booking: { service: {} },
        invoice: null,
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      const result = await service.createDispute('tenant-1', dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('dispute-1');
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'dispute.created', expect.any(Object));
      expect(mockNotificationService.sendInApp).toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(service.createDispute('tenant-1', dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      const dtoWithInvoice = { ...dto, invoiceId: 'inv-1' };
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', tenantId: 'tenant-1' });
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.createDispute('tenant-1', dtoWithInvoice)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addEvidence', () => {
    const file = { fileName: 'photo.jpg', fileType: 'image/jpeg', fileData: 'base64data' };

    it('should add evidence to dispute', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({ id: 'dispute-1', tenantId: 'tenant-1', customerId: 'cust-1' });
      mockPrisma.disputeEvidence.create.mockResolvedValue({
        id: 'ev-1',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        uploadedBy: { id: 'user-1', firstName: 'Admin', lastName: 'User' },
      });

      const result = await service.addEvidence('dispute-1', 'tenant-1', file, 'Evidence photo', 'user-1');

      expect(result.fileName).toBe('photo.jpg');
      expect(mockNotificationService.sendInApp).toHaveBeenCalled();
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue(null);

      await expect(service.addEvidence('invalid', 'tenant-1', file, 'desc', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update dispute status', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({ id: 'dispute-1', tenantId: 'tenant-1', customerId: 'cust-1' });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'dispute-1', status: 'INVESTIGATING',
        customer: {}, booking: { service: {} }, invoice: null,
      });

      const result = await service.updateStatus('dispute-1', 'tenant-1', 'INVESTIGATING');

      expect(result.status).toBe('INVESTIGATING');
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'dispute.updated', expect.any(Object));
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus('invalid', 'tenant-1', 'INVESTIGATING')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve a dispute with REFUND_FULL', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        status: 'INVESTIGATING',
        amount: 5000,
        invoice: {
          payments: [{ id: 'pay-1', amount: 5000, status: 'SUCCESS' }],
        },
      });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'dispute-1', status: 'RESOLVED', resolution: 'REFUND_FULL',
        customer: {}, booking: { service: {} }, invoice: null, resolvedBy: {},
      });

      const result = await service.resolveDispute('dispute-1', 'tenant-1', 'REFUND_FULL', 'Full refund issued', 'admin-1');

      expect(result.status).toBe('RESOLVED');
      expect(result.resolution).toBe('REFUND_FULL');
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith('pay-1', 5000, 'tenant-1');
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'dispute.resolved', expect.any(Object));
    });

    it('should resolve a dispute with REFUND_PARTIAL', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        status: 'INVESTIGATING',
        amount: 2000,
        invoice: {
          payments: [{ id: 'pay-1', amount: 5000, status: 'SUCCESS' }],
        },
      });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'dispute-1', status: 'RESOLVED', resolution: 'REFUND_PARTIAL',
        customer: {}, booking: { service: {} }, invoice: null, resolvedBy: {},
      });

      const result = await service.resolveDispute('dispute-1', 'tenant-1', 'REFUND_PARTIAL', 'Partial refund', 'admin-1');

      expect(result.status).toBe('RESOLVED');
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith('pay-1', 2000, 'tenant-1');
    });

    it('should throw NotFoundException if dispute not found', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue(null);

      await expect(service.resolveDispute('invalid', 'tenant-1', 'REFUND_FULL', 'note', 'admin-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already resolved', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        tenantId: 'tenant-1',
        status: 'RESOLVED',
        invoice: { payments: [] },
      });

      await expect(service.resolveDispute('dispute-1', 'tenant-1', 'REFUND_FULL', 'note', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should resolve without refund if resolution is not refund', async () => {
      mockPrisma.dispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        status: 'INVESTIGATING',
        amount: 5000,
        invoice: { payments: [{ id: 'pay-1', amount: 5000, status: 'SUCCESS' }] },
      });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'dispute-1', status: 'RESOLVED', resolution: 'NO_REFUND',
        customer: {}, booking: { service: {} }, invoice: null, resolvedBy: {},
      });

      const result = await service.resolveDispute('dispute-1', 'tenant-1', 'NO_REFUND', 'No refund', 'admin-1');

      expect(result.status).toBe('RESOLVED');
      expect(mockPaymentService.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe('getDisputes', () => {
    it('should return disputes with filters', async () => {
      mockPrisma.dispute.findMany.mockResolvedValue([
        { id: 'd-1', status: 'OPEN', customer: {}, booking: { service: {} }, invoice: null, resolvedBy: null, evidence: [] },
      ]);

      const result = await service.getDisputes('tenant-1', { status: 'OPEN' });

      expect(result).toHaveLength(1);
    });
  });
});
