import {
  Controller,
  Get,
  Post,
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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendTeamNotificationDto } from './dto/send-team-notification.dto';
import { WhatsAppWebhookQueryDto } from './dto/whatsapp-webhook.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly whatsAppService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List user notifications' })
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
  async unreadCount(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notificationService.getUnreadCount(user.id, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('test-email')
  @ApiOperation({ summary: 'Test email configuration' })
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
  async testSms(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { recipient: string; message: string },
  ) {
    return this.notificationService.sendSms(user.tenantId, body.recipient, body.message);
  }

  @Get('whatsapp/webhook')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async verifyWebhook(@Query() query: WhatsAppWebhookQueryDto) {
    const mode = query['hub.mode'] || '';
    const challenge = query['hub.challenge'] || '';
    const token = query['hub.verify_token'] || '';

    const expectedToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || process.env.WHATSAPP_VERIFY_TOKEN || 'bookermap_verify';

    const isValid = await this.whatsAppService.verifyWebhook(mode, token, expectedToken);

    if (isValid && challenge) {
      return challenge;
    }

    throw new HttpException('Verification failed', HttpStatus.FORBIDDEN);
  }

  @Post('whatsapp/webhook')
  @ApiExcludeEndpoint()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: any) {
    return this.whatsAppService.handleDeliveryWebhook(req.body);
  }
}
