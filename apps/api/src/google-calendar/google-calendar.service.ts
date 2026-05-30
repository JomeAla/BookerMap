import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private getOAuth2Client() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, userId: string) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    }).catch(() => null);

    const googleEmail = ticket?.getPayload()?.email || null;

    await this.prisma.googleCalendarToken.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail,
      },
    });

    return { connected: true, email: googleEmail };
  }

  async getStatus(userId: string) {
    const token = await this.prisma.googleCalendarToken.findUnique({
      where: { userId },
    });
    if (!token) return { connected: false };
    return {
      connected: true,
      email: token.googleEmail,
      expiresAt: token.expiryDate,
    };
  }

  async disconnect(userId: string) {
    await this.prisma.googleCalendarToken.delete({
      where: { userId },
    }).catch(() => {});
    return { disconnected: true };
  }

  private async getAuthClient(userId: string) {
    const token = await this.prisma.googleCalendarToken.findUnique({
      where: { userId },
    });
    if (!token) throw new UnauthorizedException('Google Calendar not connected');

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiryDate?.getTime(),
    });

    oauth2Client.on('tokens', async (newTokens: any) => {
      const updateData: any = {};
      if (newTokens.access_token) updateData.accessToken = newTokens.access_token;
      if (newTokens.refresh_token) updateData.refreshToken = newTokens.refresh_token;
      if (newTokens.expiry_date) updateData.expiryDate = new Date(newTokens.expiry_date);
      if (Object.keys(updateData).length) {
        await this.prisma.googleCalendarToken.update({
          where: { userId },
          data: updateData,
        });
      }
    });

    return oauth2Client;
  }

  async syncBookings(userId: string, tenantId: string) {
    const auth = await this.getAuthClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const bookings = await this.prisma.booking.findMany({
      where: {
        technicianId: userId,
        tenantId,
        startTime: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        customer: true,
        service: true,
      },
      orderBy: { startTime: 'asc' },
    });

    this.logger.log(`Syncing ${bookings.length} future bookings for user ${userId}`);

    const results: { bookingId: string; eventId?: string; status: string }[] = [];

    for (const booking of bookings) {
      try {
        const description = [
          `Booking: ${booking.id}`,
          `Customer: ${booking.customer.firstName} ${booking.customer.lastName}`,
          `Phone: ${booking.customer.phone}`,
          `Service: ${booking.service.name}`,
          `Status: ${booking.status}`,
        ].join('\n');

        const event = {
          summary: `${booking.service.name} - ${booking.customer.firstName} ${booking.customer.lastName}`,
          description,
          start: {
            dateTime: booking.startTime.toISOString(),
            timeZone: 'Africa/Lagos',
          },
          end: {
            dateTime: booking.endTime.toISOString(),
            timeZone: 'Africa/Lagos',
          },
        };

        const existingEvents = await calendar.events.list({
          calendarId: 'primary',
          q: `Booking: ${booking.id}`,
          timeMin: new Date(booking.startTime.getTime() - 60000).toISOString(),
          timeMax: new Date(booking.endTime.getTime() + 60000).toISOString(),
          maxResults: 1,
        });

        if (existingEvents.data.items?.length) {
          const existingId = existingEvents.data.items[0].id!;
          await calendar.events.update({
            calendarId: 'primary',
            eventId: existingId,
            requestBody: event,
          });
          results.push({ bookingId: booking.id, eventId: existingId, status: 'updated' });
        } else {
          const created = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });
          results.push({ bookingId: booking.id, eventId: created.data.id!, status: 'created' });
        }
      } catch (error) {
        this.logger.error(`Failed to sync booking ${booking.id}`, error instanceof Error ? error.message : error);
        results.push({ bookingId: booking.id, status: 'failed' });
      }
    }

    return { synced: results.length, results };
  }
}
