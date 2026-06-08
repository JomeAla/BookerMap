import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { WebPushService } from './web-push.service';
import { WhatsAppService } from './whatsapp.service';
import { SmsCreditService } from './sms-credit.service';
import { PlatformSmsSettingsService } from './platform-sms-settings.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendTeamNotificationDto } from './dto/send-team-notification.dto';
import { WhatsAppWebhookQueryDto } from './dto/whatsapp-webhook.dto';
import { GrantSmsCreditsDto, SmsSettingsDto, WhatsappSettingsDto, ToggleSmsSettingsDto } from './dto/sms-settings.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly webPushService: WebPushService,
    private readonly whatsAppService: WhatsAppService,
    private readonly smsCreditService: SmsCreditService,
    private readonly platformSmsSettingsService: PlatformSmsSettingsService,
    private readonly configService: ConfigService,
  ) {}

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for push notifications' })
  @ApiResponse({ status: 200, description: 'VAPID public key' })
  getVapidKey() {
    return { publicKey: this.webPushService.getPublicKey() };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  async pushSubscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.webPushService.subscribe(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('push/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  async pushUnsubscribe(
    @CurrentUser() user: { id: string },
    @Body() body: { endpoint: string },
  ) {
    return this.webPushService.unsubscribe(user.id, body.endpoint);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async findAll(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query() filters: NotificationFilterDto,
  ) {
    return this.notificationService.getUserNotifications(user.id, user.tenantId, filters);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async unreadCount(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notificationService.getUnreadCount(user.id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('test-email')
  @ApiOperation({ summary: 'Test email configuration' })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  async testEmail(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { recipient: string; subject: string; message: string },
  ) {
    return this.notificationService.sendEmail(user.tenantId, body.recipient, body.subject, body.message);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('send-team')
  @ApiOperation({ summary: 'Send notification to team members' })
  @ApiResponse({ status: 200, description: 'Team notification sent' })
  async sendTeam(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: SendTeamNotificationDto,
  ) {
    return this.notificationService.sendTeamNotification(user.tenantId, dto.userIds, dto.title, dto.body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('test-sms')
  @ApiOperation({ summary: 'Test SMS configuration' })
  @ApiResponse({ status: 200, description: 'Test SMS sent' })
  async testSms(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { recipient: string; message: string },
  ) {
    return this.notificationService.sendSms(user.tenantId, body.recipient, body.message);
  }

  // Platform SMS/WhatsApp Settings (ADMIN only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('platform-settings')
  @ApiOperation({ summary: 'Get platform SMS/WhatsApp settings (admin only)' })
  async getPlatformSettings() {
    return this.platformSmsSettingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('platform-settings/sms')
  @ApiOperation({ summary: 'Update SMS gateway settings (admin only)' })
  async updateSmsSettings(@Body() dto: SmsSettingsDto) {
    return this.platformSmsSettingsService.updateSmsSettings(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('platform-settings/whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp Business API settings (admin only)' })
  async updateWhatsappSettings(@Body() dto: WhatsappSettingsDto) {
    return this.platformSmsSettingsService.updateWhatsappSettings(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('platform-settings/test-sms')
  @ApiOperation({ summary: 'Test SMS gateway connection (admin only)' })
  async testSmsConnection() {
    return this.platformSmsSettingsService.testSmsConnection();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('platform-settings/test-whatsapp')
  @ApiOperation({ summary: 'Test WhatsApp connection (admin only)' })
  async testWhatsappConnection() {
    return this.platformSmsSettingsService.testWhatsappConnection();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Patch('platform-settings/toggle')
  @ApiOperation({ summary: 'Toggle SMS/WhatsApp service active status (admin only)' })
  async toggleSmsSettings(@Body() dto: ToggleSmsSettingsDto) {
    return this.platformSmsSettingsService.toggleActive(dto.isActive);
  }

  // SMS Credit Management (ADMIN can grant credits, tenants can view balance)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sms-credits/balance')
  @ApiOperation({ summary: 'Get SMS credit balance for current tenant' })
  async getCreditBalance(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.smsCreditService.getBalance(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('sms-credits/grant')
  @ApiOperation({ summary: 'Grant SMS credits to a tenant (admin only)' })
  async grantCredits(@Body() dto: GrantSmsCreditsDto, @CurrentUser() user: { id: string }) {
    return this.smsCreditService.grantCredits(dto.tenantId, dto.amount, user.id, dto.description);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sms-credits/transactions')
  @ApiOperation({ summary: 'Get SMS credit transaction history' })
  async getCreditTransactions(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.smsCreditService.getTransactions(user.tenantId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  // Webhook endpoints (no auth — called by providers)
  @Get('whatsapp/webhook')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async verifyWebhook(@Query() query: WhatsAppWebhookQueryDto) {
    const mode = query['hub.mode'] || '';
    const challenge = query['hub.challenge'] || '';
    const token = query['hub.verify_token'] || '';

    try {
      const settings = await this.platformSmsSettingsService.getDecryptedSettings();
      const expectedToken = settings?.whatsappWebhookVerifyToken || 'bookermap_verify';
      const isValid = await this.whatsAppService.verifyWebhook(mode, token, expectedToken);
      if (isValid && challenge) return challenge;
    } catch {}

    throw new HttpException('Verification failed', HttpStatus.FORBIDDEN);
  }

  @Post('whatsapp/webhook')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: any) {
    return this.whatsAppService.handleDeliveryWebhook(req.body);
  }

  @Post('sms/delivery')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async handleSmsDelivery(@Req() req: any) {
    const body = req.body;
    if (body?.id && body?.status) {
      await this.notificationService.updateDeliveryStatus(
        body.id,
        body.status,
        body.providerMessageId || body.id,
        body.failureReason || null,
      );
    }
    return { success: true };
  }
}
