import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
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

@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: ReviewFilterDto,
  ) {
    return this.reviewService.findAll(tenantId, filters);
  }

  @Get('public')
  findPublic(@Query('serviceId') serviceId?: string) {
    return this.reviewService.findPublic(serviceId);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  approve(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reviewService.approve(id, tenantId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  reject(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reviewService.reject(id, tenantId);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER)
  reply(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: ReviewReplyDto) {
    return this.reviewService.reply(id, tenantId, dto);
  }
}
