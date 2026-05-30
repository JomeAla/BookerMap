import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpException, Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackSettingsDto } from './dto/paystack-settings.dto';
import { FlutterwaveSettingsDto } from './dto/flutterwave-settings.dto';
import { WhatsAppSettingsDto } from '../notification/dto/whatsapp-settings.dto';
import { encrypt, decrypt } from './helpers/crypto.helper';
import axios from 'axios';

@Controller('payments/settings')
@UseGuards(JwtAuthGuard)
export class PaymentSettingsController {
  private readonly logger = new Logger(PaymentSettingsController.name);

  constructor(private prisma: PrismaService) {}

  @Get()
  async getSettings(@TenantId() tenantId: string) {
    const settings = await this.prisma.paymentSettings.findMany({
      where: { tenantId },
    });
    return {
      success: true,
      data: settings.map((s) => ({
        id: s.id,
        provider: s.provider,
        publicKey: s.publicKey,
        webhookSecret: s.webhookSecret ? '***hidden***' : null,
        isLive: s.isLive,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  @Post('paystack')
  async savePaystack(@Body() dto: PaystackSettingsDto, @TenantId() tenantId: string) {
    const data: any = { provider: 'PAYSTACK', tenantId };
    if (dto.publicKey) data.publicKey = dto.publicKey;
    if (dto.secretKey) data.secretKey = encrypt(dto.secretKey);
    if (dto.webhookSecret) data.webhookSecret = dto.webhookSecret;

    const settings = await this.prisma.paymentSettings.upsert({
      where: { tenantId_provider: { tenantId, provider: 'PAYSTACK' } },
      create: { ...data, isActive: true },
      update: data,
    });

    return {
      success: true,
      data: { id: settings.id, provider: settings.provider, isActive: settings.isActive },
    };
  }

  @Post('flutterwave')
  async saveFlutterwave(@Body() dto: FlutterwaveSettingsDto, @TenantId() tenantId: string) {
    const data: any = { provider: 'FLUTTERWAVE', tenantId };
    if (dto.publicKey) data.publicKey = dto.publicKey;
    if (dto.secretKey) data.secretKey = encrypt(dto.secretKey);
    if (dto.encryptionKey) data.encryptionKey = encrypt(dto.encryptionKey);

    const settings = await this.prisma.paymentSettings.upsert({
      where: { tenantId_provider: { tenantId, provider: 'FLUTTERWAVE' } },
      create: { ...data, isActive: true },
      update: data,
    });

    return {
      success: true,
      data: { id: settings.id, provider: settings.provider, isActive: settings.isActive },
    };
  }

  @Post('whatsapp')
  async saveWhatsApp(@Body() dto: WhatsAppSettingsDto, @TenantId() tenantId: string) {
    const provider = 'WHATSAPP';

    const existing = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: provider as any } },
    });

    const data: any = {};
    if (dto.whatsappPhoneNumberId) data.whatsappPhoneNumberId = dto.whatsappPhoneNumberId;
    if (dto.whatsappBusinessAccountId) data.whatsappBusinessAccountId = dto.whatsappBusinessAccountId;
    if (dto.whatsappAccessToken) data.whatsappAccessToken = encrypt(dto.whatsappAccessToken);

    if (existing) {
      const settings = await this.prisma.paymentSettings.update({
        where: { id: existing.id },
        data,
      });
      return { success: true, data: { id: settings.id, provider: settings.provider } };
    }

    const settings = await this.prisma.paymentSettings.create({
      data: {
        tenantId,
        provider: provider as any,
        publicKey: '',
        secretKey: `wa_${Date.now()}`,
        ...data,
        isActive: true,
      },
    });

    return { success: true, data: { id: settings.id, provider: settings.provider } };
  }

  @Post('validate')
  async validate(
    @Body() body: { provider: 'PAYSTACK' | 'FLUTTERWAVE' },
    @TenantId() tenantId: string,
  ) {
    const settings = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: body.provider } },
    });
    if (!settings) throw new HttpException('Settings not found for this provider', 404);

    const secretKey = decrypt(settings.secretKey);

    try {
      if (body.provider === 'PAYSTACK') {
        const response = await axios.get('https://api.paystack.co/balance', {
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        });
        return { success: true, message: 'Paystack connected successfully', data: response.data };
      } else {
        const response = await axios.get('https://api.flutterwave.com/v3/balances', {
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        });
        return { success: true, message: 'Flutterwave connected successfully', data: response.data };
      }
    } catch (error: any) {
      throw new HttpException(
        `Connection failed: ${error.response?.data?.message || error.message}`,
        502,
      );
    }
  }

  @Put()
  async updateSettings(@Body() body: any, @TenantId() tenantId: string) {
    const { provider, ...updates } = body;
    if (!provider) throw new HttpException('Provider is required', 400);

    const data: any = {};
    if (updates.publicKey) data.publicKey = updates.publicKey;
    if (updates.secretKey) data.secretKey = encrypt(updates.secretKey);
    if (updates.webhookSecret) data.webhookSecret = updates.webhookSecret;
    if (updates.encryptionKey) data.encryptionKey = encrypt(updates.encryptionKey);
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.isLive !== undefined) data.isLive = updates.isLive;

    const settings = await this.prisma.paymentSettings.update({
      where: { tenantId_provider: { tenantId, provider } },
      data,
    });

    return { success: true, data: { id: settings.id, provider: settings.provider } };
  }

  @Delete(':provider')
  async removeProvider(@Param('provider') provider: string, @TenantId() tenantId: string) {
    if (!['PAYSTACK', 'FLUTTERWAVE', 'WHATSAPP'].includes(provider)) {
      throw new HttpException('Invalid provider', 400);
    }

    await this.prisma.paymentSettings.delete({
      where: { tenantId_provider: { tenantId, provider: provider as any } },
    });

    return { success: true, message: `${provider} settings removed` };
  }
}
