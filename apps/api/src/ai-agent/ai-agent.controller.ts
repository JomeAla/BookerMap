import { Controller, Post, Get, Put, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';
import { ChatMessageDto, CreateResponseDto } from './dto/chat-message.dto';
import { AiSettingsDto } from './dto/ai-settings.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('AI Agent')
@Controller('ai')
export class AiAgentController {
  constructor(
    private readonly chatService: ChatService,
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send chat message', description: 'Send a message to the AI agent and get a response (public)' })
  @ApiResponse({ status: 200, description: 'AI response' })
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
  @ApiBearerAuth()
  @Get('conversations')
  @ApiOperation({ summary: 'List AI conversations', description: 'Returns all AI conversations for the tenant' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async listConversations(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.chatService.getConversations(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages', description: 'Returns all messages in a conversation' })
  @ApiParam({ name: 'id', type: String, description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  async getConversationMessages(@Param('id') id: string) {
    return this.chatService.getConversationMessages(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('settings')
  @ApiOperation({ summary: 'Get AI settings', description: 'Returns AI agent configuration settings' })
  @ApiResponse({ status: 200, description: 'AI settings' })
  async getSettings(@CurrentUser() user: any) {
    return this.chatService.getSettings(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('settings')
  @ApiOperation({ summary: 'Update AI settings', description: 'Update AI agent configuration settings' })
  @ApiResponse({ status: 200, description: 'AI settings updated' })
  async updateSettings(@Body() dto: AiSettingsDto, @CurrentUser() user: any) {
    return this.chatService.updateSettings(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('responses')
  @ApiOperation({ summary: 'Create custom response', description: 'Create a custom automated response for the AI agent' })
  @ApiResponse({ status: 201, description: 'Custom response created' })
  async createResponse(@Body() dto: CreateResponseDto, @CurrentUser() user: any) {
    return this.chatService.createCustomResponse(
      user.tenantId,
      dto.trigger,
      dto.response,
      dto.language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('analytics/stats')
  @ApiOperation({ summary: 'Get AI analytics stats', description: 'Returns conversation statistics for a date range' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Analytics stats' })
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getConversationStats(user.tenantId, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('analytics/queries')
  @ApiOperation({ summary: 'Get common queries', description: 'Returns most common AI queries' })
  @ApiResponse({ status: 200, description: 'Common queries' })
  async getCommonQueries(@CurrentUser() user: any) {
    return this.analyticsService.getCommonQueries(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('analytics/failed')
  @ApiOperation({ summary: 'Get failed conversations', description: 'Returns AI conversations that failed or were unanswered' })
  @ApiResponse({ status: 200, description: 'Failed conversations' })
  async getFailedConversations(@CurrentUser() user: any) {
    return this.analyticsService.getFailedConversations(user.tenantId);
  }

  private getTenantId(req: any): string {
    return req.tenantId || req.user?.tenantId || 'default';
  }
}
