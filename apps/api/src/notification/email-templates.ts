const BRAND_COLOR = '#059669';
const BRAND_DARK = '#047857';
const BRAND_LIGHT = '#D1FAE5';
const TEXT_COLOR = '#1F2937';
const MUTED_COLOR = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const BG_COLOR = '#F9FAFB';
const ACCENT_BG = '#ECFDF5';

const COMPANY_NAME = 'BookerMap';
const COMPANY_TAGLINE = 'Smart Booking for Service Businesses';
const COMPANY_ADDRESS = 'Lagos, Nigeria';
const SUPPORT_EMAIL = 'support@bookermap.com';
const WEBSITE_URL = 'https://bookermap.com';

const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/bookermap',
  facebook: 'https://facebook.com/bookermap',
  instagram: 'https://instagram.com/bookermap',
  linkedin: 'https://linkedin.com/company/bookermap',
};

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount: number | undefined, currency = 'USD'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

function formatDate(value: Date | string | undefined, withTime = true): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  const options: Intl.DateTimeFormatOptions = withTime
    ? { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  try {
    return d.toLocaleString('en-US', options);
  } catch {
    return d.toString();
  }
}

function socialIconsHtml(): string {
  return `
    <tr>
      <td align="center" style="padding:8px 0 0 0;">
        <a href="${SOCIAL_LINKS.twitter}" style="display:inline-block;margin:0 6px;text-decoration:none;color:${MUTED_COLOR};font-size:18px;" aria-label="Twitter">𝕏</a>
        <a href="${SOCIAL_LINKS.facebook}" style="display:inline-block;margin:0 6px;text-decoration:none;color:${MUTED_COLOR};font-size:18px;" aria-label="Facebook">f</a>
        <a href="${SOCIAL_LINKS.instagram}" style="display:inline-block;margin:0 6px;text-decoration:none;color:${MUTED_COLOR};font-size:18px;" aria-label="Instagram">◎</a>
        <a href="${SOCIAL_LINKS.linkedin}" style="display:inline-block;margin:0 6px;text-decoration:none;color:${MUTED_COLOR};font-size:18px;" aria-label="LinkedIn">in</a>
      </td>
    </tr>`;
}

function buildLayout(opts: {
  preheader?: string;
  headerBg?: string;
  headerIcon?: string;
  headerTitle: string;
  headerSubtitle?: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
  text?: string;
}): { html: string; text: string } {
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : '';
  const headerBg = opts.headerBg || BRAND_COLOR;
  const headerIcon = opts.headerIcon || '📅';
  const unsubscribeUrl = opts.unsubscribeUrl || `${WEBSITE_URL}/unsubscribe`;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <title>${escapeHtml(opts.headerTitle)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .bm-container { width: 100% !important; max-width: 100% !important; }
      .bm-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .bm-header-title { font-size: 22px !important; }
      .bm-cta { width: 100% !important; box-sizing: border-box; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${TEXT_COLOR};-webkit-text-size-adjust:100%;">
  <span style="display:none;font-size:1px;color:${BG_COLOR};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="bm-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td bgcolor="${headerBg}" class="bm-pad" style="background-color:${headerBg};padding:32px 40px;text-align:center;">
              <div style="font-size:28px;line-height:1;margin-bottom:8px;">${headerIcon}</div>
              <h1 class="bm-header-title" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(opts.headerTitle)}</h1>
              ${opts.headerSubtitle ? `<p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(opts.headerSubtitle)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td class="bm-pad" style="padding:36px 40px 8px 40px;">
              <div style="font-size:14px;color:${BRAND_COLOR};font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">${COMPANY_NAME}</div>
              <hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:0 0 24px 0;">
            </td>
          </tr>
          <tr>
            <td class="bm-pad" style="padding:0 40px 32px 40px;font-size:16px;line-height:1.6;color:${TEXT_COLOR};">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="bm-pad" style="padding:24px 40px 32px 40px;background-color:${BG_COLOR};border-top:1px solid ${BORDER_COLOR};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <div style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;padding:6px 12px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:0.5px;">${COMPANY_NAME}</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size:12px;line-height:1.5;color:${MUTED_COLOR};padding:8px 0 4px 0;">
                    ${COMPANY_TAGLINE}<br>
                    ${COMPANY_ADDRESS}
                  </td>
                </tr>
                ${socialIconsHtml()}
                <tr>
                  <td align="center" style="font-size:12px;line-height:1.6;color:${MUTED_COLOR};padding:16px 0 4px 0;">
                    <a href="${WEBSITE_URL}" style="color:${MUTED_COLOR};text-decoration:underline;">Website</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:${SUPPORT_EMAIL}" style="color:${MUTED_COLOR};text-decoration:underline;">Contact Support</a>
                    &nbsp;·&nbsp;
                    <a href="${unsubscribeUrl}" style="color:${MUTED_COLOR};text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size:11px;color:${MUTED_COLOR};padding-top:8px;">
                    © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const fallbackText = `${opts.headerTitle}\n${opts.headerSubtitle ? opts.headerSubtitle + '\n' : ''}\n${COMPANY_NAME} — ${COMPANY_TAGLINE}\n\n${opts.preheader || ''}\n\n---\n${COMPANY_NAME}\n${COMPANY_ADDRESS}\n${WEBSITE_URL}\nUnsubscribe: ${unsubscribeUrl}\n`;
  const text = opts.text
    ? `${opts.text}\n\n---\n${COMPANY_NAME} — ${COMPANY_TAGLINE}\n${COMPANY_ADDRESS}\n${WEBSITE_URL}\nUnsubscribe: ${unsubscribeUrl}\n`
    : fallbackText;

  return { html, text };
}

function buttonHtml(label: string, url: string, color = BRAND_COLOR): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
    <tr>
      <td align="center" bgcolor="${color}" class="bm-cta" style="border-radius:6px;background-color:${color};">
        <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;background-color:${color};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function detailsTableHtml(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (row, i) => `
    <tr>
      <td width="40%" style="padding:10px 12px;font-size:14px;color:${MUTED_COLOR};font-weight:600;border-bottom:1px solid ${BORDER_COLOR};${i === 0 ? `border-top:1px solid ${BORDER_COLOR};` : ''}">${escapeHtml(row.label)}</td>
      <td style="padding:10px 12px;font-size:14px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};${i === 0 ? `border-top:1px solid ${BORDER_COLOR};` : ''}">${row.value}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:16px 0;">${rowsHtml}</table>`;
}

export interface BookingConfirmationData {
  customerName: string;
  serviceName: string;
  startTime: Date | string;
  endTime?: Date | string;
  technicianName?: string;
  address?: string;
  totalPrice?: number;
  currency?: string;
  bookingId?: string;
  bookingUrl?: string;
  companyName?: string;
}

export function bookingConfirmation(data: BookingConfirmationData): { html: string; text: string } {
  const start = formatDate(data.startTime, true);
  const end = data.endTime ? formatDate(data.endTime, true) : '';
  const price = formatCurrency(data.totalPrice, data.currency);
  const company = data.companyName || 'your service provider';
  const bookingUrl = data.bookingUrl || `${WEBSITE_URL}/bookings/${data.bookingId || ''}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">Your booking with <strong>${escapeHtml(company)}</strong> has been confirmed. We've reserved your slot and look forward to seeing you.</p>
    ${detailsTableHtml([
      { label: 'Service', value: `<strong>${escapeHtml(data.serviceName)}</strong>` },
      { label: 'When', value: escapeHtml(start) + (end ? ` &mdash; ${escapeHtml(end)}` : '') },
      ...(data.technicianName ? [{ label: 'Technician', value: escapeHtml(data.technicianName) }] : []),
      ...(data.address ? [{ label: 'Location', value: escapeHtml(data.address) }] : []),
      ...(data.totalPrice !== undefined ? [{ label: 'Total', value: `<strong style="color:${BRAND_COLOR};">${price}</strong>` }] : []),
    ])}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('View Booking', bookingUrl)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Need to reschedule? Contact us before your appointment time.</p>
  `;

  const text = `Hi ${data.customerName},

Your booking with ${company} has been confirmed.

Service: ${data.serviceName}
When: ${start}${end ? ` - ${end}` : ''}${data.technicianName ? `\nTechnician: ${data.technicianName}` : ''}${data.address ? `\nLocation: ${data.address}` : ''}${data.totalPrice !== undefined ? `\nTotal: ${price}` : ''}

View booking: ${bookingUrl}

Need to reschedule? Contact us before your appointment time.

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Your ${data.serviceName} booking is confirmed for ${start}.`,
    headerIcon: '✅',
    headerTitle: 'Booking Confirmed',
    headerSubtitle: `We can't wait to see you`,
    bodyHtml,
    text,
  });
}

export interface BookingReminderData {
  customerName: string;
  serviceName: string;
  startTime: Date | string;
  endTime?: Date | string;
  technicianName?: string;
  address?: string;
  totalPrice?: number;
  currency?: string;
  bookingId?: string;
  bookingUrl?: string;
  hoursAway?: number;
}

export function bookingReminder(data: BookingReminderData): { html: string; text: string } {
  const start = formatDate(data.startTime, true);
  const end = data.endTime ? formatDate(data.endTime, true) : '';
  const price = formatCurrency(data.totalPrice, data.currency);
  const hours = data.hoursAway ?? 24;
  const bookingUrl = data.bookingUrl || `${WEBSITE_URL}/bookings/${data.bookingId || ''}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">This is a friendly reminder that your appointment is in <strong>${hours} hours</strong>. Please make sure you're available at the scheduled time.</p>
    <div style="background-color:${ACCENT_BG};border-left:4px solid ${BRAND_COLOR};padding:16px 20px;border-radius:4px;margin:0 0 24px 0;">
      <div style="font-size:12px;font-weight:600;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Upcoming</div>
      <div style="font-size:18px;font-weight:700;color:${TEXT_COLOR};">${escapeHtml(data.serviceName)}</div>
      <div style="font-size:14px;color:${MUTED_COLOR};margin-top:4px;">${escapeHtml(start)}</div>
    </div>
    ${detailsTableHtml([
      ...(data.technicianName ? [{ label: 'Technician', value: escapeHtml(data.technicianName) }] : []),
      ...(data.address ? [{ label: 'Location', value: escapeHtml(data.address) }] : []),
      ...(end ? [{ label: 'Ends', value: escapeHtml(end) }] : []),
      ...(data.totalPrice !== undefined ? [{ label: 'Total', value: `<strong style="color:${BRAND_COLOR};">${price}</strong>` }] : []),
    ])}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('View Booking', bookingUrl)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Need to reschedule or cancel? Please contact us as soon as possible.</p>
  `;

  const text = `Hi ${data.customerName},

This is a reminder that your appointment is in ${hours} hours.

Service: ${data.serviceName}
When: ${start}${end ? ` - ${end}` : ''}${data.technicianName ? `\nTechnician: ${data.technicianName}` : ''}${data.address ? `\nLocation: ${data.address}` : ''}${data.totalPrice !== undefined ? `\nTotal: ${price}` : ''}

View booking: ${bookingUrl}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Reminder: ${data.serviceName} in ${hours} hours — ${start}`,
    headerBg: '#F59E0B',
    headerIcon: '⏰',
    headerTitle: 'Appointment Reminder',
    headerSubtitle: `See you in ${hours} hours`,
    bodyHtml,
    text,
  });
}

export interface InvoiceEmailData {
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency?: string;
  dueDate: Date | string;
  paymentLink?: string;
  items?: { description: string; quantity: number; unitPrice: number; total: number }[];
  companyName?: string;
  invoiceUrl?: string;
  notes?: string;
}

export function invoiceEmail(data: InvoiceEmailData): { html: string; text: string } {
  const amount = formatCurrency(data.amount, data.currency);
  const dueDate = formatDate(data.dueDate, false);
  const company = data.companyName || 'your service provider';
  const paymentUrl = data.paymentLink || data.invoiceUrl || `${WEBSITE_URL}/invoices`;

  const itemsHtml = (data.items || []).length
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr>
            <th align="left" style="padding:10px 12px;background-color:${BG_COLOR};font-size:12px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BORDER_COLOR};">Description</th>
            <th align="center" width="60" style="padding:10px 12px;background-color:${BG_COLOR};font-size:12px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BORDER_COLOR};">Qty</th>
            <th align="right" width="100" style="padding:10px 12px;background-color:${BG_COLOR};font-size:12px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BORDER_COLOR};">Unit</th>
            <th align="right" width="100" style="padding:10px 12px;background-color:${BG_COLOR};font-size:12px;font-weight:600;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BORDER_COLOR};">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items!
            .map(
              (item) => `
            <tr>
              <td style="padding:10px 12px;font-size:14px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">${escapeHtml(item.description)}</td>
              <td align="center" style="padding:10px 12px;font-size:14px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">${item.quantity}</td>
              <td align="right" style="padding:10px 12px;font-size:14px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};">${formatCurrency(item.unitPrice, data.currency)}</td>
              <td align="right" style="padding:10px 12px;font-size:14px;color:${TEXT_COLOR};border-bottom:1px solid ${BORDER_COLOR};font-weight:600;">${formatCurrency(item.total, data.currency)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">${escapeHtml(company)} has issued you a new invoice. Please review the details below and pay before the due date.</p>
    <div style="background-color:${ACCENT_BG};border-radius:6px;padding:20px;margin:0 0 24px 0;text-align:center;">
      <div style="font-size:12px;font-weight:600;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Invoice ${escapeHtml(data.invoiceNumber)}</div>
      <div style="font-size:32px;font-weight:700;color:${TEXT_COLOR};">${amount}</div>
      <div style="font-size:14px;color:${MUTED_COLOR};margin-top:4px;">Due ${escapeHtml(dueDate)}</div>
    </div>
    ${itemsHtml}
    ${data.notes ? `<p style="margin:16px 0 0 0;padding:12px;background-color:${BG_COLOR};border-radius:4px;font-size:14px;color:${MUTED_COLOR};"><strong style="color:${TEXT_COLOR};">Note:</strong> ${escapeHtml(data.notes)}</p>` : ''}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('Pay Now', paymentUrl)}</p>
    <p style="margin:16px 0 0 0;font-size:13px;color:${MUTED_COLOR};text-align:center;">Secure payment powered by Paystack &amp; Flutterwave.</p>
  `;

  const itemsText = (data.items || [])
    .map((item) => `  - ${item.description}  x${item.quantity}  ${formatCurrency(item.unitPrice, data.currency)}  =  ${formatCurrency(item.total, data.currency)}`)
    .join('\n');

  const text = `Hi ${data.customerName},

${company} has issued a new invoice.

Invoice: ${data.invoiceNumber}
Amount: ${amount}
Due: ${dueDate}

${itemsText ? 'Items:\n' + itemsText + '\n' : ''}
Pay now: ${paymentUrl}

${data.notes ? 'Note: ' + data.notes + '\n' : ''}
— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Invoice ${data.invoiceNumber} for ${amount} is due ${dueDate}.`,
    headerIcon: '🧾',
    headerTitle: `Invoice ${data.invoiceNumber}`,
    headerSubtitle: `Amount due ${amount}`,
    bodyHtml,
    text,
  });
}

export interface PaymentReceiptData {
  customerName: string;
  amount: number;
  currency?: string;
  reference: string;
  paymentDate: Date | string;
  paymentMethod?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  companyName?: string;
}

export function paymentReceipt(data: PaymentReceiptData): { html: string; text: string } {
  const amount = formatCurrency(data.amount, data.currency);
  const date = formatDate(data.paymentDate, true);
  const company = data.companyName || 'your service provider';
  const receiptUrl = data.receiptUrl || data.invoiceUrl || `${WEBSITE_URL}/invoices`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">Thank you! Your payment to <strong>${escapeHtml(company)}</strong> was successful.</p>
    <div style="background-color:${ACCENT_BG};border-radius:8px;padding:32px 24px;margin:0 0 24px 0;text-align:center;">
      <div style="display:inline-block;width:56px;height:56px;line-height:56px;background-color:${BRAND_COLOR};color:#ffffff;border-radius:50%;font-size:28px;margin-bottom:12px;">✓</div>
      <div style="font-size:14px;color:${BRAND_DARK};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Payment Received</div>
      <div style="font-size:36px;font-weight:700;color:${TEXT_COLOR};line-height:1.2;">${amount}</div>
    </div>
    ${detailsTableHtml([
      { label: 'Reference', value: `<code style="font-family:Menlo,Consolas,monospace;font-size:13px;background-color:${BG_COLOR};padding:2px 6px;border-radius:3px;">${escapeHtml(data.reference)}</code>` },
      { label: 'Date', value: escapeHtml(date) },
      ...(data.paymentMethod ? [{ label: 'Method', value: escapeHtml(data.paymentMethod) }] : []),
      ...(data.invoiceNumber ? [{ label: 'Invoice', value: escapeHtml(data.invoiceNumber) }] : []),
    ])}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('View Receipt', receiptUrl)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Keep this email for your records. A copy is also available in your account.</p>
  `;

  const text = `Hi ${data.customerName},

Thank you! Your payment to ${company} was successful.

Amount: ${amount}
Reference: ${data.reference}
Date: ${date}${data.paymentMethod ? `\nMethod: ${data.paymentMethod}` : ''}${data.invoiceNumber ? `\nInvoice: ${data.invoiceNumber}` : ''}

View receipt: ${receiptUrl}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Payment of ${amount} received. Reference: ${data.reference}.`,
    headerIcon: '💳',
    headerTitle: 'Payment Successful',
    headerSubtitle: `Thank you for your payment`,
    bodyHtml,
    text,
  });
}

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  ipAddress?: string;
}

export function passwordReset(data: PasswordResetData): { html: string; text: string } {
  const expires = data.expiresInMinutes ?? 60;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">We received a request to reset the password for your ${COMPANY_NAME} account. Click the button below to choose a new password.</p>
    <p style="margin:0 0 0 0;text-align:center;">${buttonHtml('Reset My Password', data.resetUrl)}</p>
    <div style="margin:24px 0 0 0;padding:16px;background-color:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;">
      <p style="margin:0;font-size:14px;color:#92400E;"><strong>This link expires in ${expires} minutes.</strong> If you didn't request a password reset, you can safely ignore this email &mdash; your password will remain unchanged.</p>
    </div>
    ${data.ipAddress ? `<p style="margin:16px 0 0 0;font-size:12px;color:${MUTED_COLOR};">Request from IP: ${escapeHtml(data.ipAddress)}</p>` : ''}
    <p style="margin:24px 0 0 0;font-size:13px;color:${MUTED_COLOR};">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin:8px 0 0 0;font-size:12px;color:${MUTED_COLOR};word-break:break-all;background-color:${BG_COLOR};padding:10px;border-radius:4px;font-family:Menlo,Consolas,monospace;">${escapeHtml(data.resetUrl)}</p>
  `;

  const text = `Hi ${data.customerName},

We received a request to reset the password for your ${COMPANY_NAME} account.

Reset your password: ${data.resetUrl}

This link expires in ${expires} minutes.

If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
${data.ipAddress ? `\nRequest from IP: ${data.ipAddress}` : ''}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Reset your ${COMPANY_NAME} password. Link expires in ${expires} minutes.`,
    headerIcon: '🔒',
    headerTitle: 'Reset Your Password',
    headerSubtitle: 'Secure account access',
    bodyHtml,
    text,
  });
}

export interface WelcomeEmailData {
  customerName: string;
  loginUrl: string;
  companyName?: string;
  dashboardUrl?: string;
  supportUrl?: string;
}

export function welcomeEmail(data: WelcomeEmailData): { html: string; text: string } {
  const dashboard = data.dashboardUrl || data.loginUrl;
  const support = data.supportUrl || `mailto:${SUPPORT_EMAIL}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Welcome, ${escapeHtml(data.customerName)}!</p>
    <p style="margin:0 0 24px 0;">Your ${COMPANY_NAME} account is ready. You can now manage bookings, send invoices, and grow your service business all in one place.</p>
    <div style="background-color:${ACCENT_BG};border-radius:6px;padding:20px;margin:0 0 24px 0;">
      <div style="font-size:14px;font-weight:600;color:${BRAND_DARK};margin-bottom:12px;">Here's what you can do next:</div>
      <ul style="margin:0;padding-left:20px;color:${TEXT_COLOR};font-size:14px;line-height:1.8;">
        <li>Add your services and pricing</li>
        <li>Invite team members</li>
        <li>Configure your booking calendar</li>
        <li>Connect Paystack or Flutterwave to accept payments</li>
      </ul>
    </div>
    <p style="margin:0 0 0 0;text-align:center;">${buttonHtml('Go to Dashboard', dashboard)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Need help getting started? <a href="${escapeHtml(support)}" style="color:${BRAND_COLOR};text-decoration:underline;font-weight:600;">Contact our support team</a>.</p>
  `;

  const text = `Welcome, ${data.customerName}!

Your ${COMPANY_NAME} account is ready. You can now manage bookings, send invoices, and grow your service business all in one place.

Here's what you can do next:
  - Add your services and pricing
  - Invite team members
  - Configure your booking calendar
  - Connect Paystack or Flutterwave to accept payments

Go to dashboard: ${dashboard}

Need help? Contact us: ${support}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Welcome to ${COMPANY_NAME}! Your account is ready.`,
    headerIcon: '👋',
    headerTitle: `Welcome to ${COMPANY_NAME}`,
    headerSubtitle: 'Your booking business starts here',
    bodyHtml,
    text,
  });
}

export interface TeamInviteData {
  inviteeName: string;
  inviterName: string;
  companyName: string;
  role: string;
  acceptUrl: string;
  expiresInDays?: number;
  personalMessage?: string;
}

export function teamInvite(data: TeamInviteData): { html: string; text: string } {
  const expires = data.expiresInDays ?? 7;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.inviteeName)},</p>
    <p style="margin:0 0 24px 0;"><strong>${escapeHtml(data.inviterName)}</strong> has invited you to join <strong>${escapeHtml(data.companyName)}</strong> on ${COMPANY_NAME} as a <strong>${escapeHtml(data.role)}</strong>.</p>
    ${data.personalMessage ? `<div style="margin:0 0 24px 0;padding:16px 20px;background-color:${BG_COLOR};border-left:3px solid ${BRAND_COLOR};border-radius:4px;font-style:italic;color:${MUTED_COLOR};">"${escapeHtml(data.personalMessage)}"</div>` : ''}
    <div style="background-color:${ACCENT_BG};border-radius:6px;padding:20px;margin:0 0 24px 0;">
      ${detailsTableHtml([
        { label: 'Organization', value: escapeHtml(data.companyName) },
        { label: 'Role', value: escapeHtml(data.role) },
        { label: 'Invited by', value: escapeHtml(data.inviterName) },
      ])}
    </div>
    <p style="margin:0 0 0 0;text-align:center;">${buttonHtml('Accept Invitation', data.acceptUrl)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">This invitation expires in <strong>${expires} days</strong>. If you don't want to join, you can safely ignore this email.</p>
  `;

  const text = `Hi ${data.inviteeName},

${data.inviterName} has invited you to join ${data.companyName} on ${COMPANY_NAME} as a ${data.role}.
${data.personalMessage ? `\n"${data.personalMessage}"\n` : ''}
Accept invitation: ${data.acceptUrl}

This invitation expires in ${expires} days.

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `${data.inviterName} invited you to join ${data.companyName} on ${COMPANY_NAME}.`,
    headerIcon: '✉️',
    headerTitle: 'Team Invitation',
    headerSubtitle: `${data.companyName} wants you on their team`,
    bodyHtml,
    text,
  });
}

export interface FeedbackRequestData {
  customerName: string;
  serviceName: string;
  bookingId: string;
  technicianName?: string;
  surveyUrl?: string;
  reviewUrl?: string;
}

export function feedbackRequest(data: FeedbackRequestData): { html: string; text: string } {
  const surveyUrl = data.surveyUrl || `${WEBSITE_URL}/feedback/${data.bookingId}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">Thanks for choosing us for your <strong>${escapeHtml(data.serviceName)}</strong>${data.technicianName ? ` with ${escapeHtml(data.technicianName)}` : ''}. We'd love to hear how it went.</p>
    <div style="text-align:center;margin:0 0 8px 0;">
      <div style="font-size:18px;letter-spacing:6px;color:${BRAND_COLOR};">★ ★ ★ ★ ★</div>
      <div style="font-size:13px;color:${MUTED_COLOR};margin-top:4px;">Tap a star to rate your experience</div>
    </div>
    <p style="margin:16px 0 0 0;text-align:center;">${buttonHtml('Leave a Review', surveyUrl)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Your feedback helps us serve you better &mdash; and helps other customers find great service.</p>
  `;

  const text = `Hi ${data.customerName},

Thanks for choosing us for your ${data.serviceName}${data.technicianName ? ` with ${data.technicianName}` : ''}. We'd love to hear how it went.

Leave a review: ${surveyUrl}

Your feedback helps us improve.

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `How was your ${data.serviceName} experience? Leave a quick review.`,
    headerBg: '#8B5CF6',
    headerIcon: '💬',
    headerTitle: 'How Did We Do?',
    headerSubtitle: 'Your feedback matters',
    bodyHtml,
    text,
  });
}

export interface InvoiceReminderData {
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency?: string;
  dueDate: Date | string;
  invoiceId?: string;
  paymentLink?: string;
  daysOverdue?: number;
}

export function invoiceReminder(data: InvoiceReminderData): { html: string; text: string } {
  const amount = formatCurrency(data.amount, data.currency);
  const due = formatDate(data.dueDate, false);
  const paymentUrl = data.paymentLink || `${WEBSITE_URL}/invoices/${data.invoiceId || ''}`;
  const overdue = typeof data.daysOverdue === 'number' && data.daysOverdue > 0;
  const headerBg = overdue ? '#EF4444' : BRAND_COLOR;
  const headerIcon = overdue ? '⏰' : '🧾';
  const title = overdue ? `Invoice Overdue` : `Payment Reminder`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">${overdue
      ? `This is a reminder that invoice <strong>${escapeHtml(data.invoiceNumber)}</strong> for <strong>${amount}</strong> is <strong style="color:#EF4444;">${data.daysOverdue} day(s) overdue</strong>. Please make your payment as soon as possible to avoid any late fees.`
      : `This is a friendly reminder that invoice <strong>${escapeHtml(data.invoiceNumber)}</strong> for <strong>${amount}</strong> is due on <strong>${escapeHtml(due)}</strong>.`}</p>
    ${detailsTableHtml([
      { label: 'Invoice', value: escapeHtml(data.invoiceNumber) },
      { label: 'Amount', value: `<strong style="color:${headerBg};">${amount}</strong>` },
      { label: overdue ? 'Was Due' : 'Due Date', value: escapeHtml(due) },
    ])}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('Pay Now', paymentUrl, headerBg)}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Thank you for your business.</p>
  `;

  const text = `Hi ${data.customerName},

${overdue
  ? `Invoice ${data.invoiceNumber} for ${amount} is ${data.daysOverdue} day(s) overdue (was due ${due}). Please pay as soon as possible.`
  : `This is a reminder that invoice ${data.invoiceNumber} for ${amount} is due on ${due}.`}

Pay now: ${paymentUrl}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: overdue
      ? `Invoice ${data.invoiceNumber} for ${amount} is ${data.daysOverdue} day(s) overdue.`
      : `Invoice ${data.invoiceNumber} for ${amount} is due ${due}.`,
    headerBg,
    headerIcon,
    headerTitle: title,
    bodyHtml,
    text,
  });
}

export interface CampaignEmailData {
  customerName: string;
  subject: string;
  preheader?: string;
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  campaignId?: string;
  unsubscribeUrl?: string;
}

export function campaignEmail(data: CampaignEmailData): { html: string; text: string } {
  const unsubscribeUrl = data.unsubscribeUrl || `${WEBSITE_URL}/unsubscribe?c=${data.campaignId || ''}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <h2 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">${escapeHtml(data.headline)}</h2>
    <div style="font-size:16px;line-height:1.6;color:${TEXT_COLOR};">${data.bodyHtml}</div>
    ${data.ctaLabel && data.ctaUrl ? `<p style="margin:0 0 0 0;text-align:center;">${buttonHtml(data.ctaLabel, data.ctaUrl)}</p>` : ''}
  `;

  const text = `Hi ${data.customerName},

${data.headline}

${data.bodyHtml.replace(/<[^>]+>/g, '')}
${data.ctaLabel && data.ctaUrl ? `\n${data.ctaLabel}: ${data.ctaUrl}\n` : ''}
Unsubscribe: ${unsubscribeUrl}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: data.preheader || data.headline,
    headerIcon: '📣',
    headerTitle: data.subject,
    bodyHtml,
    unsubscribeUrl,
    text,
  });
}

export interface DisputeOpenedData {
  customerName: string;
  disputeId: string;
  reason: string;
  amount: number;
  currency?: string;
  reference: string;
  openedAt: Date | string;
  companyName?: string;
  disputeUrl?: string;
  evidenceDueDate?: Date | string;
}

export function disputeOpened(data: DisputeOpenedData): { html: string; text: string } {
  const amount = formatCurrency(data.amount, data.currency);
  const opened = formatDate(data.openedAt, true);
  const due = data.evidenceDueDate ? formatDate(data.evidenceDueDate, true) : null;
  const company = data.companyName || 'your service provider';
  const url = data.disputeUrl || `${WEBSITE_URL}/disputes/${data.disputeId}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">A payment dispute has been opened on a transaction from <strong>${escapeHtml(company)}</strong>. Please review the details below and respond promptly.</p>
    <div style="background-color:#FEF2F2;border-left:4px solid #EF4444;padding:16px 20px;border-radius:4px;margin:0 0 24px 0;">
      <div style="font-size:12px;font-weight:600;color:#991B1B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Action required</div>
      <div style="font-size:16px;font-weight:600;color:${TEXT_COLOR};">Dispute ${escapeHtml(data.disputeId)} opened</div>
    </div>
    ${detailsTableHtml([
      { label: 'Dispute ID', value: `<code style="font-family:Menlo,Consolas,monospace;font-size:13px;background-color:${BG_COLOR};padding:2px 6px;border-radius:3px;">${escapeHtml(data.disputeId)}</code>` },
      { label: 'Reference', value: escapeHtml(data.reference) },
      { label: 'Amount', value: `<strong>${amount}</strong>` },
      { label: 'Reason', value: escapeHtml(data.reason) },
      { label: 'Opened', value: escapeHtml(opened) },
      ...(due ? [{ label: 'Evidence due', value: `<strong style="color:#EF4444;">${escapeHtml(due)}</strong>` }] : []),
    ])}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('View Dispute', url, '#EF4444')}</p>
    <p style="margin:24px 0 0 0;font-size:14px;color:${MUTED_COLOR};text-align:center;">Submit any supporting evidence before the deadline to improve the chances of a favorable resolution.</p>
  `;

  const text = `Hi ${data.customerName},

A payment dispute has been opened on a transaction from ${company}.

Dispute ID: ${data.disputeId}
Reference: ${data.reference}
Amount: ${amount}
Reason: ${data.reason}
Opened: ${opened}${due ? `\nEvidence due: ${due}` : ''}

View dispute: ${url}

Submit any supporting evidence before the deadline to improve the chances of a favorable resolution.

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Dispute ${data.disputeId} opened — ${amount} at risk. Action required.`,
    headerBg: '#EF4444',
    headerIcon: '⚠️',
    headerTitle: 'Dispute Opened',
    headerSubtitle: 'Action required',
    bodyHtml,
    text,
  });
}

export interface DisputeResolvedData {
  customerName: string;
  disputeId: string;
  reference: string;
  amount: number;
  currency?: string;
  resolution: 'won' | 'lost' | 'accepted' | string;
  resolvedAt: Date | string;
  reason: string;
  companyName?: string;
  disputeUrl?: string;
  refundAmount?: number;
  notes?: string;
}

export function disputeResolved(data: DisputeResolvedData): { html: string; text: string } {
  const amount = formatCurrency(data.amount, data.currency);
  const refund = data.refundAmount !== undefined ? formatCurrency(data.refundAmount, data.currency) : null;
  const resolved = formatDate(data.resolvedAt, true);
  const company = data.companyName || 'your service provider';
  const url = data.disputeUrl || `${WEBSITE_URL}/disputes/${data.disputeId}`;

  const isWin = data.resolution === 'won';
  const isLoss = data.resolution === 'lost';
  const headerBg = isWin ? BRAND_COLOR : isLoss ? '#EF4444' : '#6B7280';
  const headerIcon = isWin ? '🛡️' : isLoss ? '❌' : 'ℹ️';
  const titleSuffix = isWin ? 'Resolved in Your Favor' : isLoss ? 'Resolved Against You' : 'Resolved';
  const subtitleSuffix = isWin ? 'Funds released' : isLoss ? 'Refund processed' : 'Case closed';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:${TEXT_COLOR};">Hi ${escapeHtml(data.customerName)},</p>
    <p style="margin:0 0 24px 0;">The dispute on a transaction from <strong>${escapeHtml(company)}</strong> has been resolved.</p>
    <div style="background-color:${isWin ? ACCENT_BG : isLoss ? '#FEF2F2' : BG_COLOR};border-left:4px solid ${headerBg};padding:16px 20px;border-radius:4px;margin:0 0 24px 0;">
      <div style="font-size:12px;font-weight:600;color:${isWin ? BRAND_DARK : isLoss ? '#991B1B' : MUTED_COLOR};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escapeHtml(titleSuffix)}</div>
      <div style="font-size:16px;font-weight:600;color:${TEXT_COLOR};">Dispute ${escapeHtml(data.disputeId)} — ${escapeHtml(subtitleSuffix)}</div>
    </div>
    ${detailsTableHtml([
      { label: 'Dispute ID', value: `<code style="font-family:Menlo,Consolas,monospace;font-size:13px;background-color:${BG_COLOR};padding:2px 6px;border-radius:3px;">${escapeHtml(data.disputeId)}</code>` },
      { label: 'Reference', value: escapeHtml(data.reference) },
      { label: 'Reason', value: escapeHtml(data.reason) },
      { label: 'Amount', value: amount },
      ...(refund ? [{ label: isWin ? 'Released' : 'Refunded', value: `<strong>${refund}</strong>` }] : []),
      { label: 'Resolved', value: escapeHtml(resolved) },
    ])}
    ${data.notes ? `<div style="margin:16px 0 0 0;padding:12px;background-color:${BG_COLOR};border-radius:4px;font-size:14px;color:${MUTED_COLOR};"><strong style="color:${TEXT_COLOR};">Note from ${escapeHtml(company)}:</strong> ${escapeHtml(data.notes)}</div>` : ''}
    <p style="margin:24px 0 0 0;text-align:center;">${buttonHtml('View Details', url, headerBg)}</p>
  `;

  const text = `Hi ${data.customerName},

The dispute on a transaction from ${company} has been resolved.

Dispute ID: ${data.disputeId}
Reference: ${data.reference}
Reason: ${data.reason}
Amount: ${amount}${refund ? `\n${isWin ? 'Released' : 'Refunded'}: ${refund}` : ''}
Resolved: ${resolved}
${data.notes ? `\nNote: ${data.notes}` : ''}

View details: ${url}

— ${COMPANY_NAME}`;

  return buildLayout({
    preheader: `Dispute ${data.disputeId} ${titleSuffix.toLowerCase()}. ${subtitleSuffix}.`,
    headerBg,
    headerIcon,
    headerTitle: `Dispute ${titleSuffix}`,
    headerSubtitle: subtitleSuffix,
    bodyHtml,
    text,
  });
}

export type TemplateName =
  | 'bookingConfirmation'
  | 'bookingReminder'
  | 'invoiceEmail'
  | 'invoiceReminder'
  | 'paymentReceipt'
  | 'passwordReset'
  | 'welcomeEmail'
  | 'teamInvite'
  | 'feedbackRequest'
  | 'campaignEmail'
  | 'disputeOpened'
  | 'disputeResolved';

export type TemplateData =
  | BookingConfirmationData
  | BookingReminderData
  | InvoiceEmailData
  | InvoiceReminderData
  | PaymentReceiptData
  | PasswordResetData
  | WelcomeEmailData
  | TeamInviteData
  | FeedbackRequestData
  | CampaignEmailData
  | DisputeOpenedData
  | DisputeResolvedData;

const HANDLEBARS_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderHandlebars(template: string, data: Record<string, unknown>): string {
  return template.replace(HANDLEBARS_RE, (_, key: string) => {
    const v = data[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

export function renderTemplate(name: TemplateName, data: TemplateData): { html: string; text: string; subject: string } {
  switch (name) {
    case 'bookingConfirmation': {
      const d = data as BookingConfirmationData;
      const r = bookingConfirmation(d);
      return { ...r, subject: `Booking Confirmed - ${d.serviceName}` };
    }
    case 'bookingReminder': {
      const d = data as BookingReminderData;
      const r = bookingReminder(d);
      const hours = d.hoursAway ?? 24;
      return { ...r, subject: `Reminder: ${d.serviceName} in ${hours} hours` };
    }
    case 'invoiceEmail': {
      const d = data as InvoiceEmailData;
      const r = invoiceEmail(d);
      return { ...r, subject: `Invoice ${d.invoiceNumber} - ${formatCurrency(d.amount, d.currency)}` };
    }
    case 'invoiceReminder': {
      const d = data as InvoiceReminderData;
      const r = invoiceReminder(d);
      const overdue = typeof d.daysOverdue === 'number' && d.daysOverdue > 0;
      return { ...r, subject: overdue ? `Overdue: Invoice ${d.invoiceNumber}` : `Reminder: Invoice ${d.invoiceNumber} is due` };
    }
    case 'paymentReceipt': {
      const d = data as PaymentReceiptData;
      const r = paymentReceipt(d);
      return { ...r, subject: `Payment received - ${formatCurrency(d.amount, d.currency)}` };
    }
    case 'passwordReset': {
      const d = data as PasswordResetData;
      const r = passwordReset(d);
      return { ...r, subject: `Reset your ${COMPANY_NAME} password` };
    }
    case 'welcomeEmail': {
      const r = welcomeEmail(data as WelcomeEmailData);
      return { ...r, subject: `Welcome to ${COMPANY_NAME}!` };
    }
    case 'teamInvite': {
      const d = data as TeamInviteData;
      const r = teamInvite(d);
      return { ...r, subject: `${d.inviterName} invited you to ${d.companyName}` };
    }
    case 'feedbackRequest': {
      const d = data as FeedbackRequestData;
      const r = feedbackRequest(d);
      return { ...r, subject: `How was your ${d.serviceName} experience?` };
    }
    case 'campaignEmail': {
      const d = data as CampaignEmailData;
      const r = campaignEmail(d);
      return { ...r, subject: d.subject };
    }
    case 'disputeOpened': {
      const d = data as DisputeOpenedData;
      const r = disputeOpened(d);
      return { ...r, subject: `Dispute opened - ${formatCurrency(d.amount, d.currency)}` };
    }
    case 'disputeResolved': {
      const d = data as DisputeResolvedData;
      const r = disputeResolved(d);
      return { ...r, subject: `Dispute ${d.disputeId} resolved` };
    }
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown email template: ${String(_exhaustive)}`);
    }
  }
}

export const EmailTemplates = {
  bookingConfirmation,
  bookingReminder,
  invoiceEmail,
  invoiceReminder,
  paymentReceipt,
  passwordReset,
  welcomeEmail,
  teamInvite,
  feedbackRequest,
  campaignEmail,
  disputeOpened,
  disputeResolved,
  renderTemplate,
  renderHandlebars,
};

export default EmailTemplates;
