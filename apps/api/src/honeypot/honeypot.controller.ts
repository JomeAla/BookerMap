import { Controller, Get, Post, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { HoneypotService } from './honeypot.service';

@ApiTags('Honeypot Security')
@ApiBearerAuth()
@Controller('security/honeypot')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HoneypotController {
  constructor(private readonly honeypotService: HoneypotService) {}

  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @Get('hits')
  @ApiOperation({ summary: 'List honeypot hits (bot detections)' })
  async listHits(
    @Query('trapType') trapType?: string,
    @Query('ip') ip?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.honeypotService.listHits({ trapType, ip, limit, offset });
    return { data: result };
  }

  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @Get('blocked')
  @ApiOperation({ summary: 'List currently blocked IPs' })
  async listBlocked() {
    const items = await this.honeypotService.listBlocked();
    return { data: items };
  }

  @Roles(UserRole.ADMIN, UserRole.PLATFORM_ADMIN)
  @Post(':ip/unblock')
  @ApiOperation({ summary: 'Unblock an IP address' })
  async unblock(@Param('ip') ip: string) {
    if (!ip || ip.length > 64) {
      throw new BadRequestException('Invalid IP address');
    }
    const result = await this.honeypotService.unblock(ip);
    return { data: { ip, blocked: false } };
  }
}