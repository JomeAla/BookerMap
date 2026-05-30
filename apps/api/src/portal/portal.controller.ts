import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service';
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.portalService.getProfile(user.tenantId, user.email);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdatePortalProfileDto,
  ) {
    return this.portalService.updateProfile(user.tenantId, user.email, dto);
  }
}
