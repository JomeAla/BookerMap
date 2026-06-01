import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PortalService } from './portal.service';
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Customer Portal')
@ApiBearerAuth()
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get customer portal profile', description: 'Returns the customer portal profile for the logged-in user' })
  @ApiResponse({ status: 200, description: 'Portal profile' })
  getProfile(@CurrentUser() user: any) {
    return this.portalService.getProfile(user.tenantId, user.email);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update portal profile', description: 'Update customer portal profile information' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdatePortalProfileDto,
  ) {
    return this.portalService.updateProfile(user.tenantId, user.email, dto);
  }
}
