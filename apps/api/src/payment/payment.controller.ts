import {
  Controller, Post, Get, Param, Query, Body, UseGuards, HttpException, Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private prisma: PrismaService,
  ) {}

  @Post('initialize')
  async initialize(
    @Body() dto: InitializePaymentDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      include: { customer: true },
    });
    if (!invoice) throw new HttpException('Invoice not found', 404);
    if (invoice.status === 'PAID') throw new HttpException('Invoice is already paid', 400);

    const reference = `BMR-${tenantId.slice(0, 6)}-${invoice.invoiceNumber}-${Date.now()}`.toUpperCase();

    const result = await this.paymentService.initializePayment(
      invoice.customer.email || user.email,
      invoice.total,
      {
        invoiceNumber: invoice.invoiceNumber,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
      },
      tenantId,
      dto.provider,
    );

    await this.prisma.payment.create({
      data: {
        amount: invoice.total,
        currency: 'NGN',
        status: 'PENDING',
        provider: dto.provider || 'PAYSTACK',
        providerRef: result.reference,
        invoiceId: invoice.id,
      },
    });

    return {
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        accessCode: result.accessCode,
      },
    };
  }

  @Post('verify/:reference')
  async verify(@Param('reference') reference: string, @TenantId() tenantId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference, invoice: { tenantId } },
    });
    if (!payment) throw new HttpException('Payment not found', 404);
    if (payment.status !== 'PENDING') {
      return { success: true, data: payment };
    }

    const result = await this.paymentService.verifyPayment(reference, tenantId);

    if (result.status === 'success') {
      const [updatedPayment] = await Promise.all([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS', currency: result.currency, providerData: result.customer },
        }),
        this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'PAID', paidAt: new Date() },
        }),
      ]);
      return { success: true, data: updatedPayment };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: result },
    });

    return { success: true, data: { status: result.status } };
  }

  @Get()
  async list(
    @Query('invoiceId') invoiceId: string,
    @Query('status') status: PaymentStatus,
    @Query('provider') provider: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @TenantId() tenantId: string,
  ) {
    return this.paymentService.getPaymentHistory(tenantId, {
      invoiceId,
      status,
      provider,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.paymentService.getPaymentById(id, tenantId);
  }

  @Post('refund')
  async refund(@Body() dto: RefundPaymentDto, @TenantId() tenantId: string) {
    const result = await this.paymentService.refundPayment(dto.paymentId, dto.amount, tenantId);
    return { success: true, data: result };
  }
}
