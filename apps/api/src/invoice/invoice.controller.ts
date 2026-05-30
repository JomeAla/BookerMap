import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  @Get()
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
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.findById(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(tenantId, dto);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.remove(tenantId, id);
  }

  @Post(':id/send')
  sendInvoice(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.sendInvoice(tenantId, id);
  }

  @Post(':id/pay')
  markAsPaid(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invoiceService.markAsPaid(tenantId, id);
  }

  @Get(':id/pdf')
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
