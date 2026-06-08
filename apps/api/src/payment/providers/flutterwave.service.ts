import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PaymentProvider } from '../interfaces/payment.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../helpers/crypto.helper';

interface OAuthToken {
  access_token: string;
  expires_in: number;
  acquired_at: number;
}

@Injectable()
export class FlutterwaveService implements PaymentProvider {
  private readonly logger = new Logger(FlutterwaveService.name);
  private readonly baseUrl = 'https://api.flutterwave.com/v3';
  private readonly tokenUrl = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
  private tokenCache: Map<string, OAuthToken> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private async resolveCredentials(tenantId: string): Promise<{ secretKey: string; encryptionKey?: string }> {
    const settings = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'FLUTTERWAVE' } },
    });
    if (settings?.secretKey && settings.isActive) {
      return {
        secretKey: decrypt(settings.secretKey),
        encryptionKey: settings.encryptionKey ? decrypt(settings.encryptionKey) : undefined,
      };
    }
    const fallback = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
    if (!fallback) {
      throw new HttpException('Flutterwave not configured for this tenant', 400);
    }
    return { secretKey: fallback };
  }

  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof AxiosError) {
      this.logger.error(`Flutterwave API error: ${error.message}`, error.response?.data);
      throw new HttpException(
        error.response?.data?.message || defaultMessage,
        error.response?.status || 502,
      );
    }
    if (error instanceof HttpException) throw error;
    this.logger.error(`Flutterwave unexpected error: ${(error as Error).message}`);
    throw new HttpException(defaultMessage, 502);
  }

  async getAccessToken(tenantId: string): Promise<string> {
    const cached = this.tokenCache.get(tenantId);
    if (cached && Date.now() - cached.acquired_at < cached.expires_in * 1000 - 60000) {
      return cached.access_token;
    }

    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: 'flutterwave',
          client_secret: secretKey,
          grant_type: 'client_credentials',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const token: OAuthToken = {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 3600,
        acquired_at: Date.now(),
      };
      this.tokenCache.set(tenantId, token);
      return token.access_token;
    } catch (error) {
      this.handleError(error, 'Failed to acquire Flutterwave access token');
    }
  }

  private async getAuthHeaders(tenantId: string): Promise<Record<string, string>> {
    const { secretKey } = await this.resolveCredentials(tenantId);
    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(
    email: string,
    amount: number,
    metadata: any,
    tenantId: string,
  ): Promise<{ authorizationUrl: string; reference: string; accessCode?: string }> {
    const headers = await this.getAuthHeaders(tenantId);
    const txRef = `BMR-${tenantId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    try {
      const response = await axios.post(
        `${this.baseUrl}/charges?type=card`,
        {
          tx_ref: txRef,
          amount,
          currency: metadata.currency || 'NGN',
          email,
          redirect_url: metadata.redirectUrl || undefined,
          meta: { ...metadata, tenantId },
          customer: {
            email,
            name: metadata.customerName || email,
          },
          customizations: {
            title: metadata.title || 'BookerMap Payment',
            description: metadata.description || '',
          },
        },
        { headers },
      );

      const data = response.data.data;
      return {
        authorizationUrl: data.link || data.redirect_url || data.meta?.authorization?.redirect,
        reference: txRef,
        accessCode: data.meta?.authorization?.mode === 'redirect' ? data.meta.authorization.redirect : undefined,
      };
    } catch (error) {
      this.handleError(error, 'Payment initialization failed');
    }
  }

  async verifyPayment(
    reference: string,
    tenantId: string,
  ): Promise<{ status: string; amount: number; currency: string; customer: any }> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.get(`${this.baseUrl}/transactions/${reference}/verify`, { headers });
      const data = response.data.data;
      return {
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        customer: data.customer,
      };
    } catch (error) {
      this.handleError(error, 'Payment verification failed');
    }
  }

  async createCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
    tenantId?: string,
  ): Promise<any> {
    const headers = await this.getAuthHeaders(tenantId || '');
    try {
      const response = await axios.post(
        `${this.baseUrl}/customers`,
        {
          email,
          name: `${firstName} ${lastName}`.trim(),
          phone_number: phone,
        },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Customer creation failed');
    }
  }

  async chargeCustomer(
    email: string,
    amount: number,
    authorizationCode: string,
    tenantId: string,
  ): Promise<any> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/charges?type=card`,
        {
          tx_ref: `BMR-CHG-${tenantId.slice(0, 8)}-${Date.now()}`,
          amount,
          currency: 'NGN',
          email,
          authorization: { mode: 'pin', pin: authorizationCode },
        },
        { headers },
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Charge customer failed');
    }
  }

  async refund(transactionId: string, amount: number, tenantId: string): Promise<any> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions/${transactionId}/refund`,
        { amount },
        { headers },
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Refund failed');
    }
  }

  async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string,
    tenantId: string,
  ): Promise<any> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfers/recipients`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        { headers },
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Transfer recipient creation failed');
    }
  }

  async initiateTransfer(amount: number, recipientCode: string, tenantId: string): Promise<any> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfers`,
        {
          amount,
          recipient: recipientCode,
          currency: 'NGN',
          reference: `BMR-TRF-${tenantId.slice(0, 8)}-${Date.now()}`,
        },
        { headers },
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Transfer initiation failed');
    }
  }

  async initiatePOSCharge(amount: number, email: string, currency: string = 'NGN', tenantId: string): Promise<{ reference: string; note: string }> {
    const headers = await this.getAuthHeaders(tenantId);
    const txRef = `BMR-POS-${tenantId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    try {
      const response = await axios.post(
        `${this.baseUrl}/charges?type=pos`,
        {
          tx_ref: txRef,
          amount,
          currency,
          email,
          is_pos: true,
        },
        { headers },
      );

      const data = response.data.data;
      return {
        reference: data.tx_ref || txRef,
        note: `POS charge of ${currency} ${amount} sent to terminal. Status: ${data.status || 'pending'}`,
      };
    } catch (error) {
      this.handleError(error, 'POS charge initiation failed');
    }
  }

  async listSettlements(tenantId: string, from?: Date, to?: Date): Promise<any[]> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const params: Record<string, any> = {};
      if (from) params.from = from.toISOString().split('T')[0];
      if (to) params.to = to.toISOString().split('T')[0];
      const response = await axios.get(`${this.baseUrl}/settlements`, {
        headers,
        params,
      });
      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch Flutterwave settlements', error);
      return [];
    }
  }

  async verifyPOSCharge(reference: string, tenantId: string): Promise<{ status: string; amount?: number }> {
    const headers = await this.getAuthHeaders(tenantId);
    try {
      const response = await axios.get(`${this.baseUrl}/transactions/${reference}/verify`, { headers });
      const data = response.data.data;
      return {
        status: data.status,
        amount: data.amount,
      };
    } catch (error) {
      this.handleError(error, 'POS charge verification failed');
    }
  }
}
