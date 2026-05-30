import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { SendTeamNotificationDto } from './dto/send-team-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  async findAll(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query() filters: NotificationFilterDto,
  ) {
    return this.notificationService.getUserNotifications(user.id, user.tenantId, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notificationService.getUnreadCount(user.id, user.tenantId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Test email configuration' })
  async testEmail(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { recipient: string; subject: string; message: string },
  ) {
    return this.notificationService.sendEmail(user.tenantId, body.recipient, body.subject, body.message);
  }

  @Post('send-team')
  @ApiOperation({ summary: 'Send notification to team members' })
  async sendTeam(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: SendTeamNotificationDto,
  ) {
    return this.notificationService.sendTeamNotification(user.tenantId, dto.userIds, dto.title, dto.body);
  }

  @Post('test-sms')
  @ApiOperation({ summary: 'Test SMS configuration' })
  async testSms(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() body: { recipient: string; message: string },
  ) {
    return this.notificationService.sendSms(user.tenantId, body.recipient, body.message);
  }
}
