import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './providers/paystack.service';

@Injectable()
export class CardService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
  ) {}

  async saveCard(
    tenantId: string,
    customerId: string,
    authorizationData: {
      authorizationCode: string;
      last4: string;
      brand: string;
      expMonth?: number;
      expYear?: number;
      bank?: string;
      cardType?: string;
    },
  ) {
    const existing = await this.prisma.savedCard.findFirst({
      where: { tenantId, authorizationCode: authorizationData.authorizationCode },
    });
    if (existing) return existing;

    return this.prisma.savedCard.create({
      data: { tenantId, customerId, ...authorizationData },
    });
  }

  async getCustomerCards(tenantId: string, customerId: string) {
    return this.prisma.savedCard.findMany({
      where: { tenantId, customerId, reusable: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteCard(id: string, tenantId: string) {
    return this.prisma.savedCard.deleteMany({
      where: { id, tenantId },
    });
  }

  async setDefault(id: string, customerId: string, tenantId: string) {
    await this.prisma.savedCard.updateMany({
      where: { customerId, tenantId, isDefault: true },
      data: { isDefault: false },
    });
    return this.prisma.savedCard.updateMany({
      where: { id, tenantId },
      data: { isDefault: true },
    });
  }

  async chargeSavedCard(tenantId: string, customerId: string, cardId: string, amount: number, email: string) {
    const card = await this.prisma.savedCard.findFirst({
      where: { id: cardId, tenantId, customerId },
    });
    if (!card) throw new NotFoundException('Card not found');
    return this.paystackService.chargeAuthorization(card.authorizationCode, email, amount, tenantId);
  }
}
