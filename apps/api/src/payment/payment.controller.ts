import {
  Controller, Post, Get, Param, Query, Body, UseGuards, HttpException, Logger, Delete, Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Idempotent } from '../common/decorators/idempotency.decorator';
import { PaymentService } from './payment.service';
import { CardService } from './card.service';
import { PaystackService } from './providers/paystack.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { InitPosPaymentDto } from './dto/init-pos-payment.dto';
import { SaveCardDto } from './dto/save-card.dto';
import { ChargeCardDto } from './dto/charge-card.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private cardService: CardService,
    private paystackService: PaystackService,
    private prisma: PrismaService,
  ) {}

  @Post('initialize')
  @Idempotent()
  @ApiOperation({ summary: 'Initialize payment', description: 'Initialize a payment with the selected provider (Paystack/Flutterwave)' })
  @ApiResponse({ status: 200, description: 'Payment initialized, returns authorization URL' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Invoice already paid' })
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
    if (invoice.status === 'CANCELLED') throw new HttpException('Invoice is cancelled', 400);

    const paymentAmount = dto.amount || invoice.total;
    const remainingBalance = invoice.total - invoice.paidAmount;
    if (paymentAmount > remainingBalance) {
      throw new HttpException(`Amount exceeds remaining balance of ${remainingBalance}`, 400);
    }

    const reference = `BMR-${tenantId.slice(0, 6)}-${invoice.invoiceNumber}-${Date.now()}`.toUpperCase();

    const result = await this.paymentService.initializePayment(
      invoice.customer.email || user.email,
      paymentAmount,
      {
        invoiceNumber: invoice.invoiceNumber,
        customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        partialPayment: paymentAmount < invoice.total,
      },
      tenantId,
      dto.provider,
    );

    await this.prisma.payment.create({
      data: {
        amount: paymentAmount,
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
  @Idempotent()
  @ApiOperation({ summary: 'Verify payment', description: 'Verify a payment by provider reference' })
  @ApiParam({ name: 'reference', type: String, description: 'Payment provider reference' })
  @ApiResponse({ status: 200, description: 'Payment verification result' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
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
      const updatedPayment = await this.paymentService.handlePaymentSuccess(
        payment.id,
        payment.invoiceId,
        tenantId,
        result.customer,
      );
      return { success: true, data: updatedPayment };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', providerData: result },
    });

    return { success: true, data: { status: result.status } };
  }

  @Get()
  @ApiOperation({ summary: 'List payments', description: 'Returns paginated payment history' })
  @ApiQuery({ name: 'invoiceId', required: false, type: String, description: 'Filter by invoice' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SUCCESS', 'FAILED'], description: 'Filter by status' })
  @ApiQuery({ name: 'provider', required: false, type: String, description: 'Filter by provider' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of payments' })
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
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async get(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.paymentService.getPaymentById(id, tenantId);
  }

  @Post('refund')
  @Idempotent()
  @ApiOperation({ summary: 'Refund payment', description: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refund(@Body() dto: RefundPaymentDto, @TenantId() tenantId: string) {
    const result = await this.paymentService.refundPayment(dto.paymentId, dto.amount, tenantId);
    return { success: true, data: result };
  }

  @Post('pos/initialize')
  @Idempotent()
  @ApiOperation({ summary: 'Initialize POS payment', description: 'Initialize a point-of-sale payment' })
  @ApiResponse({ status: 200, description: 'POS payment initialized' })
  async initPosPayment(@Body() dto: InitPosPaymentDto, @TenantId() tenantId: string) {
    const result = await this.paymentService.initiatePOSPayment(tenantId, dto);

    await this.prisma.payment.create({
      data: {
        amount: dto.amount,
        currency: 'NGN',
        status: 'PENDING',
        provider: dto.provider === 'flutterwave' ? 'FLUTTERWAVE' : 'PAYSTACK',
        providerRef: result.reference,
        invoiceId: dto.invoiceId,
      },
    });

    return { success: true, data: result };
  }

  @Post('pos/verify/:reference')
  @Idempotent()
  @ApiOperation({ summary: 'Verify POS payment', description: 'Verify a point-of-sale payment by reference' })
  @ApiParam({ name: 'reference', type: String, description: 'Payment reference' })
  @ApiResponse({ status: 200, description: 'POS payment verification result' })
  async verifyPosPayment(@Param('reference') reference: string, @TenantId() tenantId: string) {
    const result = await this.paymentService.verifyPOSPayment(tenantId, reference);

    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference, invoice: { tenantId } },
    });

    if (payment && result.status === 'success') {
      await this.paymentService.handlePaymentSuccess(
        payment.id,
        payment.invoiceId,
        tenantId,
      );
    }

    return { success: true, data: result };
  }

  @Get('terminals')
  @ApiOperation({ summary: 'List POS terminals', description: 'List available POS terminals from provider' })
  @ApiResponse({ status: 200, description: 'List of terminals' })
  async listTerminals(@TenantId() tenantId: string) {
    const terminals = await this.paystackService.listTerminals(tenantId);
    return { success: true, data: terminals };
  }

  @Get('pos')
  @ApiOperation({ summary: 'List POS transactions', description: 'List point-of-sale payment transactions' })
  @ApiResponse({ status: 200, description: 'List of POS payments' })
  async listPosPayments(@TenantId() tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { tenantId },
        providerRef: { startsWith: 'BMR-POS-' },
      },
      include: { invoice: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: payments };
  }

  @Post('cards')
  @ApiOperation({ summary: 'Save a card', description: 'Save a card for future payments' })
  @ApiResponse({ status: 201, description: 'Card saved' })
  async saveCard(@Body() dto: SaveCardDto, @TenantId() tenantId: string) {
    const card = await this.cardService.saveCard(tenantId, dto.customerId, {
      authorizationCode: dto.authorizationCode,
      last4: dto.last4,
      brand: dto.brand,
      expMonth: dto.expMonth,
      expYear: dto.expYear,
      bank: dto.bank,
      cardType: dto.cardType,
    });
    return { success: true, data: card };
  }

  @Get('cards/:customerId')
  @ApiOperation({ summary: 'List customer cards', description: 'Get all saved cards for a customer' })
  @ApiParam({ name: 'customerId', type: String, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'List of saved cards' })
  async listCustomerCards(@Param('customerId') customerId: string, @TenantId() tenantId: string) {
    const cards = await this.cardService.getCustomerCards(tenantId, customerId);
    return { success: true, data: cards };
  }

  @Delete('cards/:id')
  @ApiOperation({ summary: 'Delete a saved card' })
  @ApiParam({ name: 'id', type: String, description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card deleted' })
  async deleteCard(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.cardService.deleteCard(id, tenantId);
    return { success: true };
  }

  @Post('cards/:id/charge')
  @Idempotent()
  @ApiOperation({ summary: 'Charge a saved card', description: 'Charge an amount to a saved card' })
  @ApiParam({ name: 'id', type: String, description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Card charged' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async chargeCard(
    @Param('id') id: string,
    @Body() dto: ChargeCardDto,
    @TenantId() tenantId: string,
  ) {
    const card = await this.prisma.savedCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException('Card not found', 404);

    const result = await this.cardService.chargeSavedCard(
      tenantId,
      card.customerId,
      id,
      dto.amount,
      dto.email,
    );
    return { success: true, data: result };
  }

  @Put('cards/:id/default')
  @ApiOperation({ summary: 'Set default card', description: 'Set a saved card as the default payment method' })
  @ApiParam({ name: 'id', type: String, description: 'Card ID' })
  @ApiResponse({ status: 200, description: 'Default card updated' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async setDefaultCard(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    const card = await this.prisma.savedCard.findFirst({ where: { id, tenantId } });
    if (!card) throw new HttpException('Card not found', 404);
    await this.cardService.setDefault(id, card.customerId, tenantId);
    return { success: true };
  }
}
