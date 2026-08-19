import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlatformPaymentSettingsService } from './platform-payment-settings.service';
import {
  PlatformPaystackSettingsDto,
  PlatformFlutterwaveSettingsDto,
  PlatformPaymentSettingsUpdateDto,
} from './dto/platform-payment-settings.dto';

@ApiTags('Platform Payment Settings')
@ApiBearerAuth()
@Controller('platform/payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformPaymentSettingsController {
  constructor(private readonly service: PlatformPaymentSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform payment settings (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Platform payment settings' })
  async getSettings() {
    return this.service.getSettings();
  }

  @Post('paystack')
  @ApiOperation({ summary: 'Save Paystack platform credentials (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Paystack settings saved' })
  async savePaystack(@Body() dto: PlatformPaystackSettingsDto) {
    return this.service.updatePaystack(dto);
  }

  @Post('flutterwave')
  @ApiOperation({ summary: 'Save Flutterwave platform credentials (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Flutterwave settings saved' })
  async saveFlutterwave(@Body() dto: PlatformFlutterwaveSettingsDto) {
    return this.service.updateFlutterwave(dto);
  }

  @Post('general')
  @ApiOperation({ summary: 'Update general platform payment settings (platform admin only)' })
  @ApiResponse({ status: 200, description: 'General settings updated' })
  async updateGeneral(@Body() dto: PlatformPaymentSettingsUpdateDto) {
    return this.service.updateGeneral(dto);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate platform payment credentials (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(@Body() body: { provider: 'PAYSTACK' | 'FLUTTERWAVE' }) {
    return this.service.validate(body.provider);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Platform revenue snapshot (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Aggregated platform revenue from subscription renewals and SMS credit purchases' })
  async revenue() {
    return this.service.getRevenueSnapshot();
  }
}