import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices', description: 'Returns filtered list of invoices' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Filter by customer' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date filter' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  findAll(
    @TenantId() tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.invoiceService.findAll(tenantId, { customerId, status, dateFrom, dateTo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice found' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@TenantId() tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.remove(tenantId, id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice email', description: 'Send an invoice to the customer via email' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  sendInvoice(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.sendInvoice(tenantId, id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark invoice as paid', description: 'Manually mark an invoice as paid' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  markAsPaid(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.markAsPaid(tenantId, id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get invoice payments', description: 'Returns all payments for an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  getPayments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.getInvoicePayments(tenantId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF', description: 'Download an invoice as a PDF file' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async downloadPdf(@TenantId() tenantId: string, @Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoiceService.getForPdf(tenantId, id);
    const pdf = await this.invoicePdfService.generatePdf(invoice);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
