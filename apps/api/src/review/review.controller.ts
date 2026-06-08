import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewReplyDto } from './dto/review-reply.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review', description: 'Submit a new review for a service' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string; email: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(tenantId, user.id, user.role, user.email, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all reviews', description: 'Returns reviews for the tenant (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ReviewFilterDto,
  ) {
    return this.reviewService.findAll(tenantId, filters);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public reviews', description: 'Returns approved public reviews, optionally filtered by tenantSlug or serviceId' })
  @ApiQuery({ name: 'tenantSlug', required: false, type: String, description: 'Filter by tenant slug' })
  @ApiQuery({ name: 'serviceId', required: false, type: String, description: 'Filter by service ID' })
  @ApiResponse({ status: 200, description: 'List of public reviews' })
  findPublic(
    @Query('tenantSlug') tenantSlug?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.reviewService.findPublic(tenantSlug, serviceId);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a review' })
  @ApiParam({ name: 'id', type: String, description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review approved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  approve(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reviewService.approve(id, tenantId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a review' })
  @ApiParam({ name: 'id', type: String, description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review rejected' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  reject(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reviewService.reject(id, tenantId);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review', description: 'Add a reply to a review (Admin/Manager only)' })
  @ApiParam({ name: 'id', type: String, description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Reply added' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  reply(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: ReviewReplyDto) {
    return this.reviewService.reply(id, tenantId, dto);
  }
}
