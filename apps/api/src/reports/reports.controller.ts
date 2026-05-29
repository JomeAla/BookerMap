import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  getDashboardStats(@TenantId() tenantId: string) {
    return this.reportsService.getDashboardStats(tenantId);
  }

  @Get('revenue')
  getRevenue(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.reportsService.getRevenueReport(tenantId, startDate, endDate, groupBy);
  }

  @Get('bookings')
  getBookingTrends(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.reportsService.getBookingTrends(tenantId, startDate, endDate, groupBy);
  }

  @Get('technicians')
  getTechnicianPerformance(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTechnicianPerformance(tenantId, startDate, endDate);
  }

  @Get('services')
  getTopServices(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTopServices(tenantId, startDate, endDate);
  }
}
