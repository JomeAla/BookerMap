import { Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { SplitPaymentService } from './split-payment.service';

@Controller('split-payments')
@UseGuards(JwtAuthGuard)
export class SplitPaymentController {
  constructor(private readonly splitPaymentService: SplitPaymentService) {}

  @Post('create-from-booking/:bookingId')
  createFromBooking(
    @Param('bookingId') bookingId: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    return this.splitPaymentService.createSplitPayment(bookingId, invoiceId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.splitPaymentService.getTenantSplitPayments(tenantId, { status, providerId, dateFrom, dateTo });
  }

  @Get('provider/:providerId')
  getProviderPayments(
    @Param('providerId') providerId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.splitPaymentService.getProviderSplitPayments(providerId, { status, dateFrom, dateTo });
  }

  @Get('provider/:providerId/earnings')
  getProviderEarnings(@Param('providerId') providerId: string) {
    return this.splitPaymentService.getProviderEarningsSummary(providerId);
  }

  @Get('revenue')
  getRevenue(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.splitPaymentService.getPlatformRevenue(tenantId, { startDate, endDate });
  }

  @Patch(':id/release')
  release(@Param('id') id: string) {
    return this.splitPaymentService.releasePayment(id);
  }

  @Patch(':id/hold')
  hold(@Param('id') id: string) {
    return this.splitPaymentService.holdPayment(id);
  }
}
