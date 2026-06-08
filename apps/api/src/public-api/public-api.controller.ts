import {
  Controller, Get, Post, Param, Body, Query, UseGuards, Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { SchedulingService } from '../booking/scheduling.service';
import { CustomerService } from '../customer/customer.service';
import { ServiceService } from '../service/service.service';
import { TerritoryService } from '../territory/territory.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiThrottleGuard } from './guards/api-throttle.guard';
import { Scopes } from './decorators/scopes.decorator';
import { ApiKeyContext } from './decorators/api-key-context.decorator';
import { PublicApiCreateBookingDto } from './dto/public-api-create-booking.dto';
import { PublicApiCreateCustomerDto } from './dto/public-api-create-customer.dto';

@ApiTags('Public API v1')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(ApiKeyGuard, ApiThrottleGuard)
export class PublicApiController {
  private readonly logger = new Logger(PublicApiController.name);

  constructor(
    private prisma: PrismaService,
    private bookingService: BookingService,
    private schedulingService: SchedulingService,
    private customerService: CustomerService,
    private serviceService: ServiceService,
    private territoryService: TerritoryService,
  ) {}

  @Get('bookings')
  @Scopes('read:bookings')
  @ApiOperation({ summary: 'List bookings', description: 'Returns paginated list of bookings for the tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async listBookings(
    @ApiKeyContext() ctx: { tenantId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const p = parseInt(page || '1', 10);
    const l = Math.min(parseInt(limit || '50', 10), 100);
    const skip = (p - 1) * l;

    const where: any = { tenantId: ctx.tenantId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: l,
        include: { service: true, customer: true, technician: true, location: true },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
  }

  @Get('bookings/:id')
  @Scopes('read:bookings')
  @ApiOperation({ summary: 'Get booking detail' })
  @ApiParam({ name: 'id', type: String })
  async getBooking(
    @ApiKeyContext() ctx: { tenantId: string },
    @Param('id') id: string,
  ) {
    const booking = await this.bookingService.findById(ctx.tenantId, id);
    return { data: booking };
  }

  @Post('bookings')
  @Scopes('write:bookings')
  @ApiOperation({ summary: 'Create a booking' })
  async createBooking(
    @ApiKeyContext() ctx: { tenantId: string },
    @Body() dto: PublicApiCreateBookingDto,
  ) {
    const booking = await this.bookingService.create(ctx.tenantId, {
      serviceId: dto.serviceId,
      customerId: dto.customerId,
      startTime: dto.startTime,
      technicianId: dto.technicianId,
      locationId: dto.locationId,
      notes: dto.notes,
      selectedModifiers: dto.selectedModifiers,
      couponCode: dto.couponCode,
    } as any);
    return { data: booking };
  }

  @Get('services')
  @Scopes('read:services')
  @ApiOperation({ summary: 'List services', description: 'Returns all active services for the tenant' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'locationId', required: false, type: String })
  async listServices(
    @ApiKeyContext() ctx: { tenantId: string },
    @Query('categoryId') categoryId?: string,
    @Query('locationId') locationId?: string,
  ) {
    const services = await this.serviceService.findAll(ctx.tenantId, categoryId, locationId);
    return { data: services };
  }

  @Get('services/:id')
  @Scopes('read:services')
  @ApiOperation({ summary: 'Get service', description: 'Returns a single service with modifiers and intake fields' })
  @ApiParam({ name: 'id', type: String })
  async getService(
    @ApiKeyContext() ctx: { tenantId: string },
    @Param('id') id: string,
  ) {
    const service = await this.serviceService.findById(ctx.tenantId, id);
    return { data: service };
  }

  @Get('customers')
  @Scopes('read:customers')
  @ApiOperation({ summary: 'List customers', description: 'Returns paginated list of customers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listCustomers(
    @ApiKeyContext() ctx: { tenantId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.customerService.findAll(ctx.tenantId, {
      page: parseInt(page || '1', 10),
      limit: Math.min(parseInt(limit || '50', 10), 100),
      search,
    });
    return result;
  }

  @Post('customers')
  @Scopes('write:customers')
  @ApiOperation({ summary: 'Create a customer' })
  async createCustomer(
    @ApiKeyContext() ctx: { tenantId: string },
    @Body() dto: PublicApiCreateCustomerDto,
  ) {
    const customer = await this.customerService.create(ctx.tenantId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      notes: dto.notes,
      address: dto.address,
    } as any);
    return { data: customer };
  }

  @Get('availability')
  @Scopes('read:availability')
  @ApiOperation({ summary: 'Check availability', description: 'Returns available time slots for a service and date, optionally filtered by technician' })
  @ApiQuery({ name: 'serviceId', required: true, type: String })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format, defaults to today' })
  @ApiQuery({ name: 'technicianId', required: false, type: String, description: 'Filter by technician' })
  async checkAvailability(
    @ApiKeyContext() ctx: { tenantId: string },
    @Query('serviceId') serviceId: string,
    @Query('date') date?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    const d = date || new Date().toISOString().split('T')[0];
    const slots = await this.schedulingService.getAvailableSlots(serviceId, d, ctx.tenantId);
    const filtered = technicianId ? slots.filter((s: any) => s.technicianId === technicianId) : slots;
    return { data: filtered };
  }

  @Get('territories')
  @Scopes('read:territories')
  @ApiOperation({ summary: 'List territories', description: 'Returns all active territories for the tenant' })
  async listTerritories(@ApiKeyContext() ctx: { tenantId: string }) {
    const territories = await this.territoryService.findAll(ctx.tenantId);
    return { data: territories };
  }

  @Get('technicians')
  @Scopes('read:technicians')
  @ApiOperation({ summary: 'List technicians', description: 'Returns all active technicians for the tenant' })
  async listTechnicians(@ApiKeyContext() ctx: { tenantId: string }) {
    const technicians = await this.prisma.user.findMany({
      where: { tenantId: ctx.tenantId, role: UserRole.TECHNICIAN, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        skills: true,
        availability: true,
      },
      orderBy: { firstName: 'asc' },
    });
    return { data: technicians };
  }

  @Get('customers/:id')
  @Scopes('read:customers')
  @ApiOperation({ summary: 'Get customer', description: 'Returns a single customer by ID' })
  @ApiParam({ name: 'id', type: String })
  async getCustomer(
    @ApiKeyContext() ctx: { tenantId: string },
    @Param('id') id: string,
  ) {
    const customer = await this.customerService.findById(ctx.tenantId, id);
    return { data: customer };
  }
}
