import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NigeriaBulkSMSClient } from 'nigeriabulksms-sdk';
import * as crypto from 'crypto';

@Injectable()
export class PlatformSmsSettingsService {
  private readonly logger = new Logger(PlatformSmsSettingsService.name);
  private encryptionKey: string;
  private encryptionIVLength = 16;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || 'default-encryption-key-change-me-32ch';
    this.encryptionKey = key.length >= 32 ? key.slice(0, 32) : key.padEnd(32, '0');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(this.encryptionIVLength);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getSettings() {
    const settings = await this.prisma.platformSmsSettings.findFirst();
    if (!settings) {
      return {
        smsProvider: 'africas_talking',
        smsApiUsername: null,
        smsApiSenderId: 'BookerMap',
        smsShortCode: null,
        smsWebhookPath: '/api/v1/sms/delivery',
        whatsappProvider: 'meta',
        whatsappBusinessId: null,
        whatsappPhoneNumberId: null,
        whatsappWebhookPath: '/api/v1/notifications/whatsapp/webhook',
        whatsappWebhookVerifyToken: null,
        isActive: true,
      };
    }

    return {
      id: settings.id,
      smsProvider: settings.smsProvider,
      smsApiUsername: settings.smsApiUsername,
      smsApiKey: settings.smsApiKey ? '••••••••' : null,
      smsApiSenderId: settings.smsApiSenderId,
      smsShortCode: settings.smsShortCode,
      smsWebhookPath: settings.smsWebhookPath,
      smsPricePerUnit: settings.smsPricePerUnit,
      whatsappProvider: settings.whatsappProvider,
      whatsappAccessToken: settings.whatsappAccessToken ? '••••••••' : null,
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
      whatsappBusinessId: settings.whatsappBusinessId,
      whatsappWebhookPath: settings.whatsappWebhookPath,
      whatsappWebhookVerifyToken: settings.whatsappWebhookVerifyToken ? '••••••••' : null,
      whatsappPricePerUnit: settings.whatsappPricePerUnit,
      isActive: settings.isActive,
    };
  }

  async getDecryptedSettings() {
    const settings = await this.prisma.platformSmsSettings.findFirst();
    if (!settings) return null;

    return {
      ...settings,
      smsApiKey: settings.smsApiKey ? this.decrypt(settings.smsApiKey) : null,
      whatsappAccessToken: settings.whatsappAccessToken ? this.decrypt(settings.whatsappAccessToken) : null,
      whatsappWebhookVerifyToken: settings.whatsappWebhookVerifyToken ? this.decrypt(settings.whatsappWebhookVerifyToken) : null,
    };
  }

async updateSmsSettings(data: {
    smsProvider?: string;
    smsApiUsername?: string;
    smsApiKey?: string;
    smsApiSenderId?: string;
    smsShortCode?: string;
    smsPricePerUnit?: number;
    whatsappPricePerUnit?: number;
  }) {
    const existing = await this.prisma.platformSmsSettings.findFirst();

    const encryptedKey = data.smsApiKey ? this.encrypt(data.smsApiKey) : undefined;

    if (existing) {
      const updateData: any = {};
      if (data.smsProvider) updateData.smsProvider = data.smsProvider;
      if (data.smsApiUsername) updateData.smsApiUsername = data.smsApiUsername;
      if (encryptedKey) updateData.smsApiKey = encryptedKey;
      if (data.smsApiSenderId) updateData.smsApiSenderId = data.smsApiSenderId;
      if (data.smsShortCode) updateData.smsShortCode = data.smsShortCode;
      if (data.smsPricePerUnit !== undefined) updateData.smsPricePerUnit = data.smsPricePerUnit;
      if (data.whatsappPricePerUnit !== undefined) updateData.whatsappPricePerUnit = data.whatsappPricePerUnit;

      return this.prisma.platformSmsSettings.update({ where: { id: existing.id }, data: updateData });
    }

    return this.prisma.platformSmsSettings.create({
      data: {
        smsProvider: data.smsProvider || 'nigeria_bulk_sms',
        smsApiUsername: data.smsApiUsername || '',
        smsApiKey: encryptedKey || '',
        smsApiSenderId: data.smsApiSenderId || 'BookerMap',
        smsShortCode: data.smsShortCode || '',
        smsPricePerUnit: data.smsPricePerUnit ?? 1.0,
        whatsappPricePerUnit: data.whatsappPricePerUnit ?? 1.5,
      },
    });
  }

  async updateWhatsappSettings(data: {
    whatsappProvider?: string;
    whatsappAccessToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappBusinessId?: string;
    whatsappWebhookVerifyToken?: string;
  }) {
    const existing = await this.prisma.platformSmsSettings.findFirst();

    const encryptedToken = data.whatsappAccessToken ? this.encrypt(data.whatsappAccessToken) : undefined;
    const encryptedVerifyToken = data.whatsappWebhookVerifyToken ? this.encrypt(data.whatsappWebhookVerifyToken) : undefined;

    if (existing) {
      const updateData: any = {};
      if (data.whatsappProvider) updateData.whatsappProvider = data.whatsappProvider;
      if (data.whatsappPhoneNumberId) updateData.whatsappPhoneNumberId = data.whatsappPhoneNumberId;
      if (data.whatsappBusinessId) updateData.whatsappBusinessId = data.whatsappBusinessId;
      if (encryptedToken) updateData.whatsappAccessToken = encryptedToken;
      if (encryptedVerifyToken) updateData.whatsappWebhookVerifyToken = encryptedVerifyToken;

      return this.prisma.platformSmsSettings.update({ where: { id: existing.id }, data: updateData });
    }

    return this.prisma.platformSmsSettings.create({
      data: {
        whatsappProvider: data.whatsappProvider || 'meta',
        whatsappAccessToken: encryptedToken || '',
        whatsappPhoneNumberId: data.whatsappPhoneNumberId || '',
        whatsappBusinessId: data.whatsappBusinessId || '',
        whatsappWebhookVerifyToken: encryptedVerifyToken || '',
      },
    });
  }

  async testSmsConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await this.getDecryptedSettings();
    if (!settings || !settings.smsApiKey) {
      return { success: false, message: 'SMS credentials not configured' };
    }

    const username = settings.smsApiUsername || '';
    const password = settings.smsApiKey;

    try {
      const client = new NigeriaBulkSMSClient({ username, password });
      const balance = await client.data.getBalance();
      return { success: true, message: `Connected! Account balance: ${balance.balance} ${balance.currency || 'units'}` };
    } catch (e: any) {
      return { success: false, message: `Connection failed: ${e.message || 'Unknown error'}` };
    }
  }

  async testWhatsappConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await this.getDecryptedSettings();
    if (!settings || !settings.whatsappAccessToken) {
      return { success: false, message: 'WhatsApp credentials not configured' };
    }

    try {
      const phoneId = settings.whatsappPhoneNumberId;
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneId}`,
        { headers: { Authorization: `Bearer ${settings.whatsappAccessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        return { success: true, message: `Connected. Phone: ${data.verified_name || data.display_phone_number || 'OK'}` };
      }
      return { success: false, message: `API returned ${response.status}` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async toggleActive(isActive: boolean) {
    const existing = await this.prisma.platformSmsSettings.findFirst();
    if (existing) {
      return this.prisma.platformSmsSettings.update({ where: { id: existing.id }, data: { isActive } });
    }
    return this.prisma.platformSmsSettings.create({ data: { isActive, smsPricePerUnit: 1.0, whatsappPricePerUnit: 1.5 } });
  }
}