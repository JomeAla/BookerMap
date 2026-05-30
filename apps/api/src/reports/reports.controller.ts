import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get dashboard stats', description: 'Returns summary statistics for the dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  getDashboardStats(@TenantId() tenantId: string) {
    return this.reportsService.getDashboardStats(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report', description: 'Returns revenue data grouped by day/week/month' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'], description: 'Group by period' })
  @ApiResponse({ status: 200, description: 'Revenue report data' })
  getRevenue(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.reportsService.getRevenueReport(tenantId, startDate, endDate, groupBy);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get booking trends', description: 'Returns booking trends data grouped by day/week/month' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'], description: 'Group by period' })
  @ApiResponse({ status: 200, description: 'Booking trends data' })
  getBookingTrends(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.reportsService.getBookingTrends(tenantId, startDate, endDate, groupBy);
  }

  @Get('technicians')
  @ApiOperation({ summary: 'Get technician performance', description: 'Returns technician performance metrics' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Technician performance data' })
  getTechnicianPerformance(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTechnicianPerformance(tenantId, startDate, endDate);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get top services', description: 'Returns top performing services' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Top services data' })
  getTopServices(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTopServices(tenantId, startDate, endDate);
  }
}
