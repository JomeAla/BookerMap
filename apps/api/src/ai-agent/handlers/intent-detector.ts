export interface PaymentIntent {
  type: 'PAYMENT_INTENT' | 'PAYMENT_CONFIRM' | 'PAYMENT_DECLINE' | null;
  amount?: number;
  invoiceNumber?: string;
  confidence: number;
}

const payPhrases = [
  'pay', 'payment', 'make payment', 'pay invoice', 'pay now',
  'i want to pay', 'i need to pay', 'can i pay', 'how do i pay',
  'pay my bill', 'pay bill', 'settle', 'pay my invoice', 'make a payment',
  'i would like to pay', 'let me pay', 'pay my balance', 'outstanding',
];

const confirmPhrases = [
  'yes', 'yeah', 'sure', 'proceed', 'ok', 'okay',
  'go ahead', 'pay now', 'confirm payment', 'confirm',
  'let\'s do it', 'do it',
];

const declinePhrases = [
  'no', 'not now', 'later', 'maybe later', 'cancel',
  'never mind', 'no thanks', 'not right now',
];

export function detectPaymentIntent(message: string): PaymentIntent {
  const lower = message.toLowerCase().trim();

  const isConfirm = confirmPhrases.some(p =>
    p === lower || lower.startsWith(p + ' ') || lower.endsWith(' ' + p) || lower.includes(' ' + p + ' ')
  );

  if (isConfirm) {
    return { type: 'PAYMENT_CONFIRM', confidence: 0.9 };
  }

  const isDecline = declinePhrases.some(p =>
    p === lower || lower.startsWith(p + ' ') || lower.endsWith(' ' + p) || lower.includes(' ' + p + ' ')
  );

  if (isDecline) {
    return { type: 'PAYMENT_DECLINE', confidence: 0.9 };
  }

  const isPayIntent = payPhrases.some(p => lower.includes(p));
  if (!isPayIntent) {
    return { type: null, confidence: 0 };
  }

  const amount = extractAmount(lower);
  const invoiceNumber = extractInvoiceNumber(lower);

  return { type: 'PAYMENT_INTENT', amount, invoiceNumber, confidence: 0.8 };
}

function extractAmount(text: string): number | undefined {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:ngn|naira|₦)/i,
    /(?:ngn|naira|₦)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /\b(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|\$)\b/i,
    /\bamount\s*(?:is|:)?\s*(\d+(?:\.\d{2})?)\b/i,
    /\b(\d{4,})(?:\.\d{2})?\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return undefined;
}

function extractInvoiceNumber(text: string): string | undefined {
  const patterns = [
    /(?:invoice|inv|ref|#)\s*[:\s]*([A-Za-z0-9][-A-Za-z0-9]{2,})/i,
    /\b(INV-\d+)\b/i,
    /\b(INV\d+)\b/i,
    /\b(invoice\s+\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}
