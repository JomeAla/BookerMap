export interface PaymentProvider {
  initializePayment(
    email: string,
    amount: number,
    metadata: any,
    tenantId: string,
  ): Promise<{
    authorizationUrl: string;
    reference: string;
    accessCode?: string;
  }>;

  verifyPayment(
    reference: string,
    tenantId: string,
  ): Promise<{
    status: string;
    amount: number;
    currency: string;
    customer: any;
  }>;

  createCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
    tenantId?: string,
  ): Promise<any>;

  chargeCustomer(
    email: string,
    amount: number,
    authorizationCode: string,
    tenantId: string,
  ): Promise<any>;

  refund(
    transactionId: string,
    amount: number,
    tenantId: string,
  ): Promise<any>;

  createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string,
    tenantId: string,
  ): Promise<any>;

  initiateTransfer(
    amount: number,
    recipientCode: string,
    tenantId: string,
  ): Promise<any>;
}
