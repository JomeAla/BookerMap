import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: CreateDisputeDto,
  ) {
    const customerId = user.role === UserRole.CUSTOMER ? user.sub : body.customerId;
    if (!customerId) throw new HttpException('customerId is required', 400);
    return this.disputeService.createDispute(tenantId, {
      customerId,
      type: body.type,
      description: body.description,
      amount: body.amount,
      bookingId: body.bookingId,
      invoiceId: body.invoiceId,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get('stats')
  async stats(@TenantId() tenantId: string) {
    return this.disputeService.getDisputeStats(tenantId);
  }

  @Get('my')
  async myDisputes(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.disputeService.getCustomerDisputes(user.sub, tenantId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.disputeService.getDisputes(tenantId, { status, type, dateFrom, dateTo });
  }

  @Get(':id')
  async findById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.disputeService.getDisputeById(id, tenantId);
  }

  @Post(':id/evidence')
  async addEvidence(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: AddEvidenceDto,
  ) {
    return this.disputeService.addEvidence(id, tenantId, {
      fileName: body.fileName,
      fileType: body.fileType,
      fileData: body.fileData,
    }, body.description || '', user.sub);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Patch(':id/status')
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateDisputeStatusDto,
  ) {
    return this.disputeService.updateStatus(id, tenantId, body.status);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @Post(':id/resolve')
  async resolve(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(id, tenantId, body.resolution, body.note, user.sub);
  }
}
