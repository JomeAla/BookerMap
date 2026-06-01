import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FlowService } from './services/flow.service';
import { CreateFlowDto, UpdateFlowDto, TestFlowDto } from './dto/flow.dto';

@ApiTags('AI Flows')
@Controller('ai/flows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  @Post()
  @ApiOperation({ summary: 'Create conversation flow' })
  @ApiResponse({ status: 201, description: 'Flow created' })
  async create(@Body() dto: CreateFlowDto, @Req() req: any) {
    return this.flowService.createFlow(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all conversation flows' })
  @ApiResponse({ status: 200, description: 'List of flows' })
  async list(@Req() req: any) {
    return this.flowService.getFlows(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow detail' })
  async get(@Param('id') id: string, @Req() req: any) {
    return this.flowService.getFlow(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flow' })
  @ApiResponse({ status: 200, description: 'Flow updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateFlowDto, @Req() req: any) {
    return this.flowService.updateFlow(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete flow' })
  @ApiResponse({ status: 200, description: 'Flow deleted' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.flowService.deleteFlow(id, req.user.tenantId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate flow' })
  @ApiResponse({ status: 201, description: 'Flow duplicated' })
  async duplicate(@Param('id') id: string, @Req() req: any) {
    return this.flowService.duplicateFlow(id, req.user.tenantId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate flow' })
  @ApiResponse({ status: 200, description: 'Flow activated' })
  async activate(@Param('id') id: string, @Req() req: any) {
    return this.flowService.activateFlow(id, req.user.tenantId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate flow' })
  @ApiResponse({ status: 200, description: 'Flow deactivated' })
  async deactivate(@Param('id') id: string, @Req() req: any) {
    return this.flowService.deactivateFlow(id, req.user.tenantId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test flow execution' })
  @ApiResponse({ status: 200, description: 'Flow test result' })
  async test(@Param('id') id: string, @Body() dto: TestFlowDto, @Req() req: any) {
    return this.flowService.testFlow(id, req.user.tenantId, {
      message: dto.message || '',
      entities: dto.context || {},
    });
  }
}
