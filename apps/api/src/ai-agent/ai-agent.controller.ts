import { Controller, Post, Get, Put, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';
import { ChatMessageDto, CreateResponseDto } from './dto/chat-message.dto';
import { AiSettingsDto } from './dto/ai-settings.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ai')
export class AiAgentController {
  constructor(
    private readonly chatService: ChatService,
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(
    @Body() dto: ChatMessageDto,
    @Req() req: any,
  ) {
    let tenantId = this.getTenantId(req);
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
      if (tenant) {
        tenantId = tenant.id;
      }
    }
    return this.chatService.processMessage(
      dto.message,
      tenantId,
      dto.conversationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async listConversations(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.chatService.getConversations(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  async getConversationMessages(@Param('id') id: string) {
    return this.chatService.getConversationMessages(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getSettings(@CurrentUser() user: any) {
    return this.chatService.getSettings(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('settings')
  async updateSettings(@Body() dto: AiSettingsDto, @CurrentUser() user: any) {
    return this.chatService.updateSettings(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('responses')
  async createResponse(@Body() dto: CreateResponseDto, @CurrentUser() user: any) {
    return this.chatService.createCustomResponse(
      user.tenantId,
      dto.trigger,
      dto.response,
      dto.language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics/stats')
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getConversationStats(user.tenantId, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics/queries')
  async getCommonQueries(@CurrentUser() user: any) {
    return this.analyticsService.getCommonQueries(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics/failed')
  async getFailedConversations(@CurrentUser() user: any) {
    return this.analyticsService.getFailedConversations(user.tenantId);
  }

  private getTenantId(req: any): string {
    return req.tenantId || req.user?.tenantId || 'default';
  }
}
