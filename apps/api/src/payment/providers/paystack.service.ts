import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PaymentProvider } from '../interfaces/payment.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../helpers/crypto.helper';

@Injectable()
export class PaystackService implements PaymentProvider {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private async resolveCredentials(tenantId: string): Promise<{ secretKey: string; webhookSecret?: string }> {
    const settings = await this.prisma.paymentSettings.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'PAYSTACK' } },
    });
    if (settings?.secretKey && settings.isActive) {
      return {
        secretKey: decrypt(settings.secretKey),
        webhookSecret: settings.webhookSecret || undefined,
      };
    }
    const fallback = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!fallback) {
      throw new HttpException('Paystack not configured for this tenant', 400);
    }
    return { secretKey: fallback };
  }

  private getHeaders(secretKey: string) {
    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof AxiosError) {
      this.logger.error(`Paystack API error: ${error.message}`, error.response?.data);
      throw new HttpException(
        error.response?.data?.message || defaultMessage,
        error.response?.status || 502,
      );
    }
    if (error instanceof HttpException) throw error;
    this.logger.error(`Paystack unexpected error: ${(error as Error).message}`);
    throw new HttpException(defaultMessage, 502);
  }

  async initializePayment(
    email: string,
    amount: number,
    metadata: any,
    tenantId: string,
  ): Promise<{ authorizationUrl: string; reference: string; accessCode?: string }> {
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100),
          metadata: { ...metadata, tenantId },
        },
        { headers: this.getHeaders(secretKey) },
      );
      const { authorization_url, reference, access_code } = response.data.data;
      return { authorizationUrl: authorization_url, reference, accessCode: access_code };
    } catch (error) {
      this.handleError(error, 'Payment initialization failed');
    }
  }

  async verifyPayment(
    reference: string,
    tenantId: string,
  ): Promise<{ status: string; amount: number; currency: string; customer: any }> {
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: this.getHeaders(secretKey),
      });
      const data = response.data.data;
      return {
        status: data.status,
        amount: data.amount / 100,
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
    const { secretKey } = await this.resolveCredentials(tenantId || '');
    try {
      const response = await axios.post(
        `${this.baseUrl}/customer`,
        { email, first_name: firstName, last_name: lastName, phone },
        { headers: this.getHeaders(secretKey) },
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
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/charge_authorization`,
        {
          email,
          amount: Math.round(amount * 100),
          authorization_code: authorizationCode,
        },
        { headers: this.getHeaders(secretKey) },
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Charge authorization failed');
    }
  }

  async refund(transactionId: string, amount: number, tenantId: string): Promise<any> {
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        { transaction: transactionId, amount: Math.round(amount * 100) },
        { headers: this.getHeaders(secretKey) },
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
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        { headers: this.getHeaders(secretKey) },
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Transfer recipient creation failed');
    }
  }

  async initiateTransfer(amount: number, recipientCode: string, tenantId: string): Promise<any> {
    const { secretKey } = await this.resolveCredentials(tenantId);
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          source: 'balance',
        },
        { headers: this.getHeaders(secretKey) },
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Transfer initiation failed');
    }
  }
}
