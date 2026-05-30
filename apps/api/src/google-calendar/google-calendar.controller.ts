import { Controller, Get, Post, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { GoogleCalendarService } from './google-calendar.service';
import { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@CurrentUser() user: any) {
    const url = this.googleCalendarService.getAuthUrl(user.sub);
    return { success: true, data: { url } };
  }

  @Get('callback')
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
  async getStatus(@CurrentUser() user: any) {
    const status = await this.googleCalendarService.getStatus(user.sub);
    return { success: true, data: status };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncBookings(@CurrentUser() user: any, @TenantId() tenantId: string) {
    const result = await this.googleCalendarService.syncBookings(user.sub, tenantId);
    return { success: true, data: result };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@CurrentUser() user: any) {
    const result = await this.googleCalendarService.disconnect(user.sub);
    return { success: true, data: result };
  }
}
