import { Controller, Post, Get, Put, Patch, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './services/chat.service';
import { AnalyticsService } from './services/analytics.service';
import { EscalationService } from './services/escalation.service';
import { ChatMessageDto, CreateResponseDto, RateMessageDto } from './dto/chat-message.dto';
import { AiSettingsDto } from './dto/ai-settings.dto';
import { EscalateDto, AssignEscalationDto, ResolveEscalationDto, EscalationFilterDto } from './dto/escalation.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('AI Agent')
@Controller('ai')
export class AiAgentController {
  constructor(
    private readonly chatService: ChatService,
    private readonly analyticsService: AnalyticsService,
    private readonly escalationService: EscalationService,
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
    const result = await this.chatService.processMessage(
      dto.message,
      tenantId,
      dto.conversationId,
    );
    if (result.conversationId) {
      const lastAssistant = await this.prisma.aiMessage.findFirst({
        where: { conversationId: result.conversationId, role: 'assistant' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (lastAssistant) {
        return { ...result, messageId: lastAssistant.id };
      }
    }
    return result;
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('messages/:id/rate')
  @ApiOperation({ summary: 'Rate AI message', description: 'Rate an assistant message 1-5 stars with optional feedback' })
  @ApiParam({ name: 'id', type: String, description: 'AI message ID' })
  @ApiResponse({ status: 200, description: 'Message rated' })
  async rateMessage(
    @Param('id') id: string,
    @Body() dto: RateMessageDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.rateMessage(id, user.tenantId, user.sub, dto.rating, dto.feedback);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('analytics/feedback')
  @ApiOperation({ summary: 'Get AI feedback stats', description: 'Returns aggregate rating stats for assistant messages' })
  @ApiResponse({ status: 200, description: 'Feedback stats' })
  async getFeedbackStats(@CurrentUser() user: any) {
    return this.analyticsService.getFeedbackStats(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('analytics/messages')
  @ApiOperation({ summary: 'Get recent rated messages', description: 'Returns recent assistant messages with ratings and feedback' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Max messages to return (default 20, max 100)' })
  @ApiResponse({ status: 200, description: 'Recent rated messages' })
  async getRecentRatedMessages(
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 20;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    return this.analyticsService.getRecentRatedMessages(user.tenantId, safeLimit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('escalate')
  @ApiOperation({ summary: 'Escalate to human agent', description: 'Request escalation to a human agent for a conversation' })
  @ApiResponse({ status: 201, description: 'Escalation created' })
  async escalate(@Body() dto: EscalateDto, @CurrentUser() user: any) {
    return this.escalationService.escalate(
      dto.conversationId,
      user.tenantId,
      dto.customerId || user.sub,
      dto.reason,
      dto.priority,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('escalations')
  @ApiOperation({ summary: 'List escalations', description: 'Returns escalations for the tenant (agents/admins)' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED'] as const })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of escalations' })
  async listEscalations(
    @Query() filters: EscalationFilterDto,
    @CurrentUser() user: any,
  ) {
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 20;
    return this.escalationService.getOpenEscalations(user.tenantId, filters.status, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('escalations/my')
  @ApiOperation({ summary: 'My escalations', description: 'Returns escalations assigned to the current agent' })
  @ApiResponse({ status: 200, description: 'My escalations' })
  async myEscalations(@CurrentUser() user: any) {
    return this.escalationService.getMyEscalations(user.sub, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('escalations/:id')
  @ApiOperation({ summary: 'Get escalation detail', description: 'Returns escalation with conversation history' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Escalation detail' })
  async getEscalation(@Param('id') id: string) {
    return this.escalationService.getEscalationWithConversation(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('escalations/:id/assign')
  @ApiOperation({ summary: 'Assign escalation', description: 'Assign escalation to an agent' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Escalation assigned' })
  async assignEscalation(
    @Param('id') id: string,
    @Body() dto: AssignEscalationDto,
  ) {
    return this.escalationService.assign(id, dto.agentUserId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('escalations/:id/resolve')
  @ApiOperation({ summary: 'Resolve escalation', description: 'Mark escalation as resolved' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Escalation resolved' })
  async resolveEscalation(
    @Param('id') id: string,
    @Body() dto: ResolveEscalationDto,
  ) {
    return this.escalationService.resolve(id, dto.resolution);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('escalations/stats/open-count')
  @ApiOperation({ summary: 'Get open escalation count', description: 'Returns count of open escalations' })
  @ApiResponse({ status: 200, description: 'Open count' })
  async getOpenCount(@CurrentUser() user: any) {
    const count = await this.escalationService.getOpenCount(user.tenantId);
    return { count };
  }

  private getTenantId(req: any): string {
    return req.tenantId || req.user?.tenantId || 'default';
  }
}
