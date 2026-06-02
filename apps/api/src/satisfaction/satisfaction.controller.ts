import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SatisfactionService } from './satisfaction.service';
import { SurveyDto } from './dto/survey.dto';
import { NpsDto } from './dto/nps.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@ApiTags('Satisfaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('satisfaction')
export class SatisfactionController {
  constructor(private satisfactionService: SatisfactionService) {}

  @Post('survey')
  @ApiOperation({ summary: 'Submit a satisfaction survey' })
  @ApiResponse({ status: 201, description: 'Survey recorded' })
  recordSurvey(@TenantId() tenantId: string, @Body() dto: SurveyDto) {
    return this.satisfactionService.recordSurvey(tenantId, dto);
  }

  @Post('nps')
  @ApiOperation({ summary: 'Submit an NPS response' })
  @ApiResponse({ status: 201, description: 'NPS recorded' })
  recordNPS(@TenantId() tenantId: string, @Body() dto: NpsDto) {
    return this.satisfactionService.recordNPS(tenantId, dto.customerId, dto.score, dto.reason);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('csat')
  @ApiOperation({ summary: 'Get CSAT score' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'CSAT score' })
  getCSAT(@TenantId() tenantId: string, @Query() dateRange: DateRangeDto) {
    return this.satisfactionService.getCSATScore(tenantId, dateRange);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('nps')
  @ApiOperation({ summary: 'Get NPS score' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'NPS score' })
  getNPS(@TenantId() tenantId: string, @Query() dateRange: DateRangeDto) {
    return this.satisfactionService.getNPSScore(tenantId, dateRange);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('trend')
  @ApiOperation({ summary: 'Get monthly satisfaction trend' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trend data' })
  getTrend(@TenantId() tenantId: string, @Query('months') months?: string) {
    return this.satisfactionService.getSatisfactionTrend(tenantId, months ? parseInt(months) : 6);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('feedback')
  @ApiOperation({ summary: 'Get feedback grouped by category' })
  @ApiResponse({ status: 200, description: 'Feedback by category' })
  getFeedback(@TenantId() tenantId: string) {
    return this.satisfactionService.getFeedbackByCategory(tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('surveys')
  @ApiOperation({ summary: 'List all surveys' })
  @ApiQuery({ name: 'touchpoint', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of surveys' })
  findAll(
    @TenantId() tenantId: string,
    @Query('touchpoint') touchpoint?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.satisfactionService.findAll(tenantId, { touchpoint, startDate, endDate });
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer satisfaction history' })
  @ApiResponse({ status: 200, description: 'Customer satisfaction data' })
  getCustomer(@TenantId() tenantId: string, @Param('customerId') customerId: string) {
    return this.satisfactionService.getCustomerSatisfaction(customerId, tenantId);
  }
}
