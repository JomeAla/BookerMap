import { Controller, Get, Post, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { GoogleCalendarService } from './google-calendar.service';
import { Response } from 'express';

@ApiTags('Google Calendar')
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Calendar auth URL', description: 'Get the OAuth URL to connect Google Calendar' })
  @ApiResponse({ status: 200, description: 'Authorization URL' })
  getAuthUrl(@CurrentUser() user: any) {
    const url = this.googleCalendarService.getAuthUrl(user.sub);
    return { success: true, data: { url } };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google Calendar OAuth callback', description: 'Handle the OAuth callback from Google Calendar' })
  @ApiQuery({ name: 'code', required: true, type: String, description: 'Authorization code' })
  @ApiQuery({ name: 'state', required: true, type: String, description: 'User ID from state parameter' })
  @ApiResponse({ status: 302, description: 'Redirects to settings page' })
  async handleCallback(@Query('code') code: string, @Query('state') userId: string, @Res() res: Response) {
    try {
      await this.googleCalendarService.handleCallback(code, userId);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/calendar?connected=true`);
    } catch {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/calendar?error=true`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Calendar sync status', description: 'Check if Google Calendar is connected and synced' })
  @ApiResponse({ status: 200, description: 'Sync status' })
  async getStatus(@CurrentUser() user: any) {
    const status = await this.googleCalendarService.getStatus(user.sub);
    return { success: true, data: status };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync bookings to Google Calendar', description: 'Sync bookings to the connected Google Calendar' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncBookings(@CurrentUser() user: any, @TenantId() tenantId: string) {
    const result = await this.googleCalendarService.syncBookings(user.sub, tenantId);
    return { success: true, data: result };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Google Calendar', description: 'Disconnect and revoke Google Calendar access' })
  @ApiResponse({ status: 200, description: 'Calendar disconnected' })
  async disconnect(@CurrentUser() user: any) {
    const result = await this.googleCalendarService.disconnect(user.sub);
    return { success: true, data: result };
  }
}
