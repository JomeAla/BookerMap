import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../payment/payment.service';

export interface PaymentIntentParams {
  tenantId: string;
  phone?: string;
  email?: string;
  amount?: number;
  invoiceNumber?: string;
}

export interface PaymentIntentResult {
  success: boolean;
  message: string;
  data?: {
    authorizationUrl?: string;
    reference?: string;
    invoiceNumber?: string;
    amount?: number;
    currency?: string;
    invoiceId?: string;
    noInvoices?: boolean;
  };
}

export interface PaymentConfirmResult {
  success: boolean;
  message: string;
  data?: {
    status: string;
    amount: number;
    invoiceNumber: string;
    reference: string;
    paymentLink?: string;
  };
}

@Injectable()
export class PaymentHandler {
  private readonly logger = new Logger(PaymentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async handlePaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const { tenantId, phone, email, amount, invoiceNumber } = params;

    const customerWhere: Record<string, any> = { tenantId };
    if (phone) customerWhere.phone = phone;
    if (email) customerWhere.email = email;

    const customer = await this.prisma.customer.findFirst({ where: customerWhere });
    if (!customer) {
      return {
        success: false,
        message: "I couldn't find your account. Please provide the phone number or email you used for your booking.",
      };
    }

    let invoice;
    if (invoiceNumber) {
      invoice = await this.prisma.invoice.findFirst({
        where: { tenantId, customerId: customer.id, invoiceNumber },
      });
    } else {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          customerId: customer.id,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      invoice = invoices[0];
    }

    if (!invoice) {
      return {
        success: false,
        message: "I couldn't find any outstanding invoices for your account.",
        data: { noInvoices: true },
      };
    }

    if (amount && Math.abs(amount - invoice.total) > 1) {
      return {
        success: false,
        message: `The amount you mentioned (${formatCurrency(amount)}) doesn't match your invoice ${invoice.invoiceNumber} which is for ${formatCurrency(invoice.total)}.`,
        data: {
          amount: invoice.total,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: invoice.id,
        },
      };
    }

    const customerEmail = customer.email || `${customer.phone?.replace(/\D/g, '')}@bookermap.com`;

    let paymentResult;
    try {
      paymentResult = await this.paymentService.initializePayment(
        customerEmail,
        invoice.total,
        {
          invoiceId: invoice.id,
          customerId: customer.id,
          tenantId,
          source: 'ai_chat',
        },
        tenantId,
      );
    } catch (error) {
      this.logger.error(`Payment initialization failed: ${(error as Error).message}`);
      return {
        success: false,
        message: 'Sorry, there was an error processing your payment. Please try again later.',
      };
    }

    try {
      const { providerName } = await this.paymentService.getProviderForTenant(tenantId);
      await this.prisma.payment.create({
        data: {
          amount: invoice.total,
          currency: 'NGN',
          status: 'PENDING',
          provider: providerName,
          providerRef: paymentResult.reference,
          invoiceId: invoice.id,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create payment record: ${(error as Error).message}`);
    }

    return {
      success: true,
      message: `I've prepared a payment for invoice ${invoice.invoiceNumber} (${formatCurrency(invoice.total)}). Click the button below to complete your payment.`,
      data: {
        authorizationUrl: paymentResult.authorizationUrl,
        reference: paymentResult.reference,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        currency: 'NGN',
        invoiceId: invoice.id,
      },
    };
  }

  async handlePaymentConfirmation(reference: string, tenantId: string): Promise<PaymentConfirmResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: reference, invoice: { tenantId } },
      include: { invoice: true },
    });

    if (!payment) {
      return { success: false, message: "I couldn't find a payment with that reference." };
    }

    if (payment.status === 'SUCCESS') {
      return {
        success: true,
        message: `Your payment of ${formatCurrency(payment.invoice.total)} for invoice ${payment.invoice.invoiceNumber} was successful. Thank you!`,
        data: {
          status: 'SUCCESS',
          amount: payment.amount,
          invoiceNumber: payment.invoice.invoiceNumber,
          reference: payment.providerRef!,
        },
      };
    }

    if (payment.status === 'FAILED') {
      return {
        success: false,
        message: `Your payment for invoice ${payment.invoice.invoiceNumber} failed. Would you like to try again?`,
        data: {
          status: 'FAILED',
          amount: payment.amount,
          invoiceNumber: payment.invoice.invoiceNumber,
          reference: payment.providerRef!,
        },
      };
    }

    try {
      const verification = await this.paymentService.verifyPayment(reference, tenantId);
      if (verification.status === 'success') {
        await this.paymentService.handlePaymentSuccess(payment.id, payment.invoiceId, tenantId, verification);
        return {
          success: true,
          message: `Your payment of ${formatCurrency(payment.invoice.total)} for invoice ${payment.invoice.invoiceNumber} was successful. Thank you!`,
          data: {
            status: 'SUCCESS',
            amount: payment.amount,
            invoiceNumber: payment.invoice.invoiceNumber,
            reference: payment.providerRef!,
          },
        };
      }
    } catch {
      // Verification failed or still pending
    }

    return {
      success: true,
      message: `Your payment for invoice ${payment.invoice.invoiceNumber} is still being processed. Please check back shortly.`,
      data: {
        status: 'PENDING',
        amount: payment.amount,
        invoiceNumber: payment.invoice.invoiceNumber,
        reference: payment.providerRef!,
      },
    };
  }
}

function formatCurrency(amount: number): string {
  return `NGN ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
