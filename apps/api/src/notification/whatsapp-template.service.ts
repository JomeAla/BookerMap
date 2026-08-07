import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWhatsAppTemplateDto, UpdateWhatsAppTemplateDto } from './dto/whatsapp-template.dto';

@Injectable()
export class WhatsAppTemplateService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateWhatsAppTemplateDto) {
    const existing = await this.prisma.whatsAppTemplate.findUnique({
      where: { tenantId_templateName: { tenantId, templateName: dto.templateName } },
    });
    if (existing) {
      throw new BadRequestException(
        `A WhatsApp template with name "${dto.templateName}" already exists for this tenant`,
      );
    }
    return this.prisma.whatsAppTemplate.create({
      data: { ...dto, tenantId, paramKeys: dto.paramKeys ?? [] },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.whatsAppTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const tpl = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!tpl) throw new NotFoundException('WhatsApp template not found');
    return tpl;
  }

  async findByTemplateName(tenantId: string, templateName: string) {
    return this.prisma.whatsAppTemplate.findFirst({
      where: { tenantId, templateName, isActive: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateWhatsAppTemplateDto) {
    await this.findById(tenantId, id);
    return this.prisma.whatsAppTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.whatsAppTemplate.delete({ where: { id } });
    return { success: true };
  }

  render(body: string, params: string[]): string {
    let result = body;
    for (let i = 0; i < params.length; i++) {
      result = result.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g'), params[i] || '');
    }
    return result;
  }

  async renderTemplate(
    tenantId: string,
    templateName: string,
    params: string[],
  ): Promise<string> {
    const tpl = await this.findByTemplateName(tenantId, templateName);
    if (!tpl) return '';
    return this.render(tpl.body, params);
  }
}
