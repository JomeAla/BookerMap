import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notification/email.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private webhookService: WebhookService,
  ) {}

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    return `INV-${String(count + 1).padStart(4, '0')}`;
  }

  async create(tenantId: string, dto: CreateInvoiceDto) {
    const lineItems = dto.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = dto.discount || 0;
    const taxRate = dto.taxRate || 0;
    const tax = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + tax;

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        tenantId,
        customerId: dto.customerId,
        bookingId: dto.bookingId,
        dueDate: new Date(dto.dueDate),
        subtotal,
        tax,
        taxRate,
        discount: discountAmount,
        total,
        notes: dto.notes,
        status: 'DRAFT',
        lineItems: { create: lineItems },
      },
      include: { lineItems: true, customer: true, booking: true },
    });

    this.webhookService.dispatchEvent(tenantId, 'invoice.created', { invoiceId: invoice.id, invoiceNumber })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    return invoice;
  }

  async findAll(
    tenantId: string,
    filters?: { customerId?: string; status?: string; dateFrom?: string; dateTo?: string },
  ) {
    const where: any = { tenantId };
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    return this.prisma.invoice.findMany({
      where,
      include: { lineItems: true, customer: true, booking: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true, customer: true, booking: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findById(tenantId, id);
    const { lineItems: newLineItems, ...data } = dto;

    const updateData: any = { ...data };
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    if (newLineItems) {
      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      const items = newLineItems.map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || 1) * (item.unitPrice || 0),
      }));
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = data.discount ?? 0;
      const taxRate = data.taxRate ?? 0;
      const tax = (subtotal - discountAmount) * (taxRate / 100);
      const total = subtotal - discountAmount + tax;
      Object.assign(updateData, { subtotal, tax, taxRate, discount: discountAmount, total });
      updateData.lineItems = { create: items };
    }

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, customer: true, booking: true, payments: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async getForPdf(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        lineItems: true,
        customer: true,
        booking: { include: { service: true } },
        payments: true,
        tenant: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async sendInvoice(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only draft invoices can be sent');

    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });

    if (invoice.customer?.email) {
      this.emailService.sendInvoiceEmail(invoice.customer.email, {
        invoiceNumber: invoice.invoiceNumber,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        items: invoice.lineItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      }).catch(err => this.logger.error('Failed to send invoice email', err));
    }

    return this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { lineItems: true, customer: true, booking: true, payments: true },
    });
  }

  async markAsPaid(tenantId: string, id: string) {
    const invoice = await this.findById(tenantId, id);
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already paid');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
      include: { lineItems: true, customer: true, booking: true, payments: true },
    });

    this.webhookService.dispatchEvent(tenantId, 'invoice.paid', { invoiceId: id, invoiceNumber: invoice.invoiceNumber })
      .catch(err => this.logger.error('Webhook dispatch failed', err));

    return updated;
  }
}
