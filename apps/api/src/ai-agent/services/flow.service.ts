import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlowDto, UpdateFlowDto, FlowContext } from '../dto/flow.dto';

@Injectable()
export class FlowService {
  constructor(private readonly prisma: PrismaService) {}

  async createFlow(tenantId: string, dto: CreateFlowDto) {
    return this.prisma.conversationFlow.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        triggerValue: dto.triggerValue,
        nodes: dto.nodes || [],
        edges: dto.edges || [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateFlow(id: string, tenantId: string, dto: UpdateFlowDto) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.prisma.conversationFlow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.trigger !== undefined && { trigger: dto.trigger }),
        ...(dto.triggerValue !== undefined && { triggerValue: dto.triggerValue }),
        ...(dto.nodes !== undefined && { nodes: dto.nodes }),
        ...(dto.edges !== undefined && { edges: dto.edges }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        version: { increment: 1 },
      },
    });
  }

  async deleteFlow(id: string, tenantId: string) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    await this.prisma.conversationFlow.delete({ where: { id } });
    return { success: true };
  }

  async getFlows(tenantId: string) {
    return this.prisma.conversationFlow.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getFlow(id: string, tenantId: string) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async activateFlow(id: string, tenantId: string) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.prisma.conversationFlow.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivateFlow(id: string, tenantId: string) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.prisma.conversationFlow.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async duplicateFlow(id: string, tenantId: string) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.prisma.conversationFlow.create({
      data: {
        tenantId,
        name: `${flow.name} (Copy)`,
        description: flow.description,
        trigger: flow.trigger,
        triggerValue: flow.triggerValue,
        nodes: flow.nodes as any,
        edges: flow.edges as any,
        isActive: false,
      },
    });
  }

  async executeFlow(flowId: string, context: FlowContext) {
    const flow = await this.prisma.conversationFlow.findUnique({
      where: { id: flowId },
    });
    if (!flow) throw new NotFoundException('Flow not found');
    if (!flow.isActive) throw new BadRequestException('Flow is not active');

    return this.executeFlowNodes(flow.nodes as any[], flow.edges as any[], context);
  }

  async findMatchingFlow(tenantId: string, context: FlowContext): Promise<any | null> {
    const flows = await this.prisma.conversationFlow.findMany({
      where: { tenantId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const lowerMsg = context.message?.toLowerCase() || '';

    for (const flow of flows) {
      const triggerValue = flow.triggerValue.toLowerCase();
      const matches = this.matchFlow(flow.trigger, triggerValue, lowerMsg, context);
      if (matches) {
        return this.executeFlowNodes(flow.nodes as any[], flow.edges as any[], context);
      }
    }

    return null;
  }

  private matchFlow(
    trigger: string,
    triggerValue: string,
    message: string,
    context: FlowContext,
  ): boolean {
    switch (trigger) {
      case 'INTENT_KEYWORD':
        return message.includes(triggerValue);

      case 'EXACT_MATCH':
        return message === triggerValue;

      case 'BOOKING_STATUS':
        return context.bookingStatus?.toLowerCase() === triggerValue;

      case 'PAYMENT_STATUS':
        return context.entities?.paymentStatus?.toLowerCase() === triggerValue;

      case 'INTENT':
        return context.entities?.intent?.toLowerCase() === triggerValue;

      default:
        return message.includes(triggerValue);
    }
  }

  private async executeFlowNodes(nodes: any[], edges: any[], context: FlowContext): Promise<any> {
    if (!nodes || nodes.length === 0) {
      return { reply: 'Flow has no nodes configured.', executed: false };
    }

    const nodeMap = new Map<string, any>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const outgoingEdges = new Map<string, any[]>();
    for (const edge of edges || []) {
      const existing = outgoingEdges.get(edge.source) || [];
      existing.push(edge);
      outgoingEdges.set(edge.source, existing);
    }

    const startNode = nodes.find((n: any) => n.nodeType === 'START' || n.data?.nodeType === 'START');
    if (!startNode) {
      return { reply: 'Flow has no START node.', executed: false };
    }

    let variables: Record<string, any> = { ...(context.entities || {}) };
    let currentNodeId = startNode.id;
    let maxIterations = 50;
    let reply = '';
    let action: string | undefined;

    while (currentNodeId && maxIterations > 0) {
      maxIterations--;
      const node = nodeMap.get(currentNodeId);
      if (!node) break;

      const nodeType = node.nodeType || node.data?.nodeType;
      const nodeData = node.data || node;

      switch (nodeType) {
        case 'START':
          break;

        case 'MESSAGE': {
          const template = nodeData.content?.text || nodeData.content || '';
          reply = this.renderTemplate(template, variables);
          break;
        }

        case 'CONDITION': {
          const condition = nodeData.content?.condition || '';
          const result = this.evaluateCondition(condition, variables, context);
          const trueEdge = (outgoingEdges.get(currentNodeId) || []).find(
            (e: any) => e.sourceHandle === 'true' || e.label === 'true',
          );
          const falseEdge = (outgoingEdges.get(currentNodeId) || []).find(
            (e: any) => e.sourceHandle === 'false' || e.label === 'false',
          );

          if (result && trueEdge) {
            currentNodeId = trueEdge.target;
            continue;
          } else if (!result && falseEdge) {
            currentNodeId = falseEdge.target;
            continue;
          }
          break;
        }

        case 'ACTION': {
          const actionType = nodeData.content?.action || nodeData.config?.action || '';
          action = actionType;
          break;
        }

        case 'INPUT': {
          const varName = nodeData.content?.variable || nodeData.config?.variable || 'input';
          variables[varName] = context.message;
          break;
        }

        case 'END':
          currentNodeId = '';
          continue;

        default:
          break;
      }

      const nextEdges = outgoingEdges.get(currentNodeId) || [];
      if (nextEdges.length > 0) {
        currentNodeId = nextEdges[0].target;
      } else {
        currentNodeId = '';
      }
    }

    return {
      reply: reply || 'Flow executed successfully.',
      executed: true,
      action,
      variables,
    };
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }

  private evaluateCondition(
    condition: string,
    variables: Record<string, any>,
    context: FlowContext,
  ): boolean {
    if (!condition) return true;

    const equalsMatch = condition.match(/^(\w+)\s*==\s*(.+)$/);
    if (equalsMatch) {
      const varName = equalsMatch[1];
      const expected = equalsMatch[2].replace(/^['"]|['"]$/g, '');
      const value = variables[varName] || (context as any)[varName];
      return String(value).toLowerCase() === expected.toLowerCase();
    }

    const notEqualsMatch = condition.match(/^(\w+)\s*!=\s*(.+)$/);
    if (notEqualsMatch) {
      const varName = notEqualsMatch[1];
      const expected = notEqualsMatch[2].replace(/^['"]|['"]$/g, '');
      const value = variables[varName] || (context as any)[varName];
      return String(value).toLowerCase() !== expected.toLowerCase();
    }

    const containsMatch = condition.match(/^(\w+)\s+contains\s+(.+)$/i);
    if (containsMatch) {
      const varName = containsMatch[1];
      const expected = containsMatch[2].replace(/^['"]|['"]$/g, '');
      const value = variables[varName] || (context as any)[varName];
      return String(value).toLowerCase().includes(expected.toLowerCase());
    }

    return false;
  }

  async testFlow(flowId: string, tenantId: string, testContext: FlowContext) {
    const flow = await this.prisma.conversationFlow.findFirst({
      where: { id: flowId, tenantId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.executeFlowNodes(flow.nodes as any[], flow.edges as any[], testContext);
  }
}
