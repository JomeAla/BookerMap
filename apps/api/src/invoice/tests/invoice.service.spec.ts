import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from '../invoice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { EmailService } from '../../notification/email.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: any;
  let webhookService: any;
  let emailService: any;

  const mockPrisma = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoiceLineItem: { createMany: jest.fn(), deleteMany: jest.fn() },
    booking: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn() },
    payment: { create: jest.fn() },
  };

  const mockWebhookService = {
    dispatchEvent: jest.fn().mockResolvedValue(true),
  };

  const mockEmailService = {
    sendInvoiceEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.invoice.findFirst.mockReset();
    mockPrisma.invoice.update.mockReset();
    mockPrisma.invoice.create.mockReset();
    mockPrisma.customer.findFirst.mockReset();
    mockPrisma.booking.findFirst.mockReset();
    mockPrisma.payment.create.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prisma = module.get(PrismaService);
    webhookService = module.get(WebhookService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invoice', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'customer-1' });
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', totalPrice: 5000 });
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-001', status: 'DRAFT' });

      const result = await service.create('tenant-1', {
        customerId: 'customer-1',
        bookingId: 'booking-1',
        dueDate: '2026-07-01T00:00:00Z',
        lineItems: [{ description: 'Service fee', quantity: 1, unitPrice: 5000, total: 5000 }],
        tax: 0, discount: 0,
      } as any);

      expect(result.id).toBe('inv-1');
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });

    it('should create invoice without booking and with defaults', async () => {
      mockPrisma.invoice.count.mockResolvedValue(5);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-2', invoiceNumber: 'INV-006', status: 'DRAFT', total: 0,
        lineItems: [], customer: {}, booking: null,
      });

      const result = await service.create('tenant-1', {
        customerId: 'customer-1',
        lineItems: [],
        dueDate: '2026-07-01T00:00:00Z',
        tax: 0, discount: 0,
      } as any);

      expect(result.invoiceNumber).toBe('INV-006');
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });
  });

  describe('sendInvoice', () => {
    it('should send an invoice email and return updated invoice', async () => {
      mockPrisma.invoice.findFirst
        .mockResolvedValueOnce({
          id: 'inv-1',
          status: 'DRAFT',
          invoiceNumber: 'INV-001',
          total: 5000,
          subtotal: 5000,
          tax: 0,
          discount: 0,
          dueDate: null,
          customer: { id: 'customer-1', email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
          lineItems: [{ description: 'Service fee', quantity: 1, unitPrice: 5000, total: 5000 }],
          booking: null,
          payments: [],
        })
        .mockResolvedValueOnce({
          id: 'inv-1', status: 'SENT', invoiceNumber: 'INV-001', total: 5000,
          subtotal: 5000, tax: 0, discount: 0, dueDate: null,
          lineItems: [], customer: {}, booking: null, payments: [],
        });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'SENT', invoiceNumber: 'INV-001', total: 5000 });

      const result = await service.sendInvoice('tenant-1', 'inv-1');

      expect(result).toBeDefined();
      expect(result!.status).toBe('SENT');
      expect(mockEmailService.sendInvoiceEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.sendInvoice('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1', status: 'SENT', invoiceNumber: 'INV-001', total: 5000,
        subtotal: 5000, tax: 0, discount: 0, dueDate: null, paidAt: null,
        customerId: 'customer-1', bookingId: null, createdAt: new Date(), updatedAt: new Date(),
        customer: { id: 'customer-1', email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
        lineItems: [], booking: null, payments: [],
      });
      mockPrisma.invoice.update.mockResolvedValue({
        id: 'inv-1', status: 'PAID', paidAt: new Date(), invoiceNumber: 'INV-001', total: 5000,
        subtotal: 5000, tax: 0, discount: 0,
        lineItems: [], customer: {}, booking: null, payments: [],
      });

      const result = await service.markAsPaid('tenant-1', 'inv-1');

      expect(result).toBeDefined();
      expect(result!.status).toBe('PAID');
      expect(mockWebhookService.dispatchEvent).toHaveBeenCalledWith('tenant-1', 'invoice.paid', expect.any(Object));
    });

    it('should throw BadRequestException if already paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1', status: 'PAID', invoiceNumber: 'INV-001', total: 5000,
        subtotal: 5000, tax: 0, discount: 0,
        lineItems: [], customer: {}, booking: null, payments: [],
      });

      await expect(service.markAsPaid('tenant-1', 'inv-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return invoices filtered by status', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([{ id: 'inv-1', status: 'DRAFT' }]);

      const result = await service.findAll('tenant-1', { status: 'DRAFT' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', status: 'DRAFT' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return an invoice by id', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'DRAFT', lineItems: [], customer: {}, booking: null, payments: [] });

      const result = await service.findById('tenant-1', 'inv-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-1');
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update invoice fields', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'DRAFT' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv-1', status: 'DRAFT', notes: 'Updated notes' });

      const result = await service.update('tenant-1', 'inv-1', { notes: 'Updated notes' } as any);

      expect(result).toBeDefined();
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.update('tenant-1', 'invalid', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'DRAFT' });
      mockPrisma.invoice.delete.mockResolvedValue({ id: 'inv-1' });

      const result = await service.remove('tenant-1', 'inv-1');

      expect(result).toBeDefined();
      expect(mockPrisma.invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.remove('tenant-1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendInvoice', () => {
    it('should throw BadRequestException if not a draft', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1', status: 'SENT', customer: { email: 'test@test.com' },
        lineItems: [],
      });

      await expect(service.sendInvoice('tenant-1', 'inv-1')).rejects.toThrow(BadRequestException);
    });
  });
});
