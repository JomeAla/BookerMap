import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { PaystackService } from '../providers/paystack.service';
import { FlutterwaveService } from '../providers/flutterwave.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let paystackService: any;
  let flutterwaveService: any;
  let webhookService: any;

  const mockPrisma = {
    paymentSettings: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPaystackService = {
    initializePayment: jest.fn(),
    refund: jest.fn(),
    initializeTerminalTransaction: jest.fn(),
    checkTerminalStatus: jest.fn(),
  };

  const mockFlutterwaveService = {
    initializePayment: jest.fn(),
    refund: jest.fn(),
    initiatePOSCharge: jest.fn(),
    verifyPOSCharge: jest.fn(),
  };

  const mockWebhookService = {
    dispatchEvent: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: FlutterwaveService, useValue: mockFlutterwaveService },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get(PrismaService);
    paystackService = module.get(PaystackService);
    flutterwaveService = module.get(FlutterwaveService);
    webhookService = module.get(WebhookService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePaymentSuccess', () => {
    it('should handle partial payment and update paidAmount', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', amount: 3000, status: 'PENDING', invoiceId: 'inv-1',
      });
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1', total: 10000, paidAmount: 0, status: 'SENT',
      });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', paidAmount: 3000, status: 'PARTIALLY_PAID' });
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', status: 'SUCCESS',
        invoice: { id: 'inv-1', total: 10000, paidAmount: 3000, status: 'PARTIALLY_PAID' },
      });

      const result = await service.handlePaymentSuccess('pay-1', 'inv-1', 'tenant-1');

      expect(result).toBeDefined();
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ paidAmount: 3000, status: 'PARTIALLY_PAID' }),
        }),
      );
    });

    it('should mark invoice as PAID when fully paid', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', amount: 10000, status: 'PENDING', invoiceId: 'inv-1',
      });
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1', total: 10000, paidAmount: 0, status: 'SENT',
      });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', paidAmount: 10000, status: 'PAID', paidAt: new Date() });
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', status: 'SUCCESS',
        invoice: { id: 'inv-1', total: 10000, paidAmount: 10000, status: 'PAID' },
      });

      const result = await service.handlePaymentSuccess('pay-1', 'inv-1', 'tenant-1');

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ paidAmount: 10000, status: 'PAID', paidAt: expect.any(Date) }),
        }),
      );
    });

    it('should return payment if already SUCCESS', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', amount: 5000, status: 'SUCCESS', invoiceId: 'inv-1',
      });

      const result = await service.handlePaymentSuccess('pay-1', 'inv-1', 'tenant-1');

      expect(result).toBeDefined();
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('should throw HttpException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.handlePaymentSuccess('invalid', 'inv-1', 'tenant-1')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException if invoice not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', amount: 5000, status: 'PENDING', invoiceId: 'inv-1',
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.handlePaymentSuccess('pay-1', 'inv-1', 'tenant-1')).rejects.toThrow(HttpException);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment and decrement paidAmount', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1', amount: 5000, status: 'SUCCESS', invoiceId: 'inv-1', provider: 'PAYSTACK', providerRef: 'ref-1',
      });
      mockPaystackService.refund.mockResolvedValue({ status: 'success' });
      mockPrisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1', paidAmount: 5000, total: 5000,
      });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1', status: 'REFUNDED' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'SENT', paidAmount: 0, paidAt: null });

      const result = await service.refundPayment('pay-1', 5000, 'tenant-1');

      expect(result).toBeDefined();
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ paidAmount: 0, status: 'SENT' }),
        }),
      );
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'payment.refunded', expect.any(Object));
    });

    it('should throw HttpException if payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.refundPayment('invalid', 1000, 'tenant-1')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException if payment is not SUCCESS', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1', status: 'PENDING', invoice: { tenantId: 'tenant-1' },
      });

      await expect(service.refundPayment('pay-1', 1000, 'tenant-1')).rejects.toThrow(HttpException);
    });
  });
});
