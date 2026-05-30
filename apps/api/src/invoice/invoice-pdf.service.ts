import { Injectable, Logger } from '@nestjs/common';
const PDFDocument = require('pdfkit');

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async generatePdf(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const customer = invoice.customer || {};
      const tenant = invoice.tenant || {};

      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text(invoice.invoiceNumber || '', 50, 78);

      const statusColors: Record<string, string> = {
        DRAFT: '#f59e0b', SENT: '#3b82f6', PAID: '#22c55e',
        OVERDUE: '#ef4444', CANCELLED: '#6b7280', REFUNDED: '#8b5cf6',
      };
      const statusColor = statusColors[invoice.status] || '#6b7280';

      doc.roundedRect(430, 50, 110, 24, 4).fill(statusColor);
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text(invoice.status, 485, 58, { width: 110, align: 'center' });

      doc.fillColor('#333333').fontSize(9).font('Helvetica');

      const topRightY = 50;
      doc.font('Helvetica-Bold').text('Date:', 420, topRightY + 40, { width: 130, align: 'right' });
      doc.font('Helvetica').text(invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-', 420, topRightY + 55, { width: 130, align: 'right' });

      doc.font('Helvetica-Bold').text('Due Date:', 420, topRightY + 75, { width: 130, align: 'right' });
      doc.font('Helvetica').text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-', 420, topRightY + 90, { width: 130, align: 'right' });

      let currentY = 140;

      doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#e5e7eb').lineWidth(1).stroke();
      currentY += 20;

      if (tenant?.name) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text(tenant.name, 50, currentY);
        currentY += 16;
        doc.fontSize(9).font('Helvetica').fillColor('#666666');
        if (tenant.address) { doc.text(tenant.address, 50, currentY); currentY += 13; }
        if (tenant.email) { doc.text(tenant.email, 50, currentY); currentY += 13; }
        if (tenant.phone) { doc.text(tenant.phone, 50, currentY); currentY += 13; }
        currentY += 10;
      }

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text('Bill To:', 50, currentY);
      currentY += 16;
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';
      doc.text(customerName, 50, currentY); currentY += 13;
      if (customer.email) { doc.text(customer.email, 50, currentY); currentY += 13; }
      if (customer.phone) { doc.text(customer.phone, 50, currentY); currentY += 13; }
      currentY += 10;

      if (invoice.booking) {
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
          .text(`Booking: ${invoice.booking.id?.substring(0, 8) || '—'}`, 50, currentY);
        currentY += 6;
        doc.text(`Service: ${invoice.booking.service?.name || '—'}`, 50, currentY);
        currentY += 16;
      }

      currentY = Math.max(currentY, 260);
      currentY += 10;

      const tableTop = currentY;
      doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor('#e5e7eb').lineWidth(1).stroke();

      const colX = [50, 310, 410, 475, 545];
      const colWidths = [260, 100, 65, 70];
      const headerY = tableTop + 8;

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666');
      doc.text('Description', colX[0], headerY, { width: colWidths[0] });
      doc.text('Qty', colX[1], headerY, { width: colWidths[1], align: 'right' });
      doc.text('Unit Price', colX[2], headerY, { width: colWidths[2], align: 'right' });
      doc.text('Total', colX[3], headerY, { width: colWidths[3], align: 'right' });

      const headerBottom = headerY + 16;
      doc.moveTo(50, headerBottom).lineTo(545, headerBottom).strokeColor('#e5e7eb').lineWidth(1).stroke();

      let rowY = headerBottom + 6;
      doc.fontSize(9).font('Helvetica').fillColor('#333333');

      const items = invoice.lineItems || [];
      for (const item of items) {
        doc.text(item.description || '', colX[0], rowY, { width: colWidths[0] });
        doc.text(String(item.quantity || 0), colX[1], rowY, { width: colWidths[1], align: 'right' });
        doc.text((item.unitPrice || 0).toFixed(2), colX[2], rowY, { width: colWidths[2], align: 'right' });
        doc.text((item.total || 0).toFixed(2), colX[3], rowY, { width: colWidths[3], align: 'right' });
        rowY += 18;
      }

      if (items.length === 0) {
        doc.text('No line items', colX[0], rowY);
        rowY += 18;
      }

      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#e5e7eb').lineWidth(1).stroke();
      rowY += 10;

      const totalsX = 380;
      const labelX = 50;

      const totals = [
        { label: 'Subtotal', value: invoice.subtotal || 0, bold: false },
      ];
      if (invoice.discount > 0) {
        totals.push({ label: 'Discount', value: -(invoice.discount || 0), bold: false });
      }
      if (invoice.tax > 0) {
        totals.push({ label: `Tax (${invoice.taxRate || 0}%)`, value: invoice.tax || 0, bold: false });
      }
      totals.push({ label: 'Total', value: invoice.total || 0, bold: true });

      for (const t of totals) {
        if (t.bold) {
          doc.moveTo(labelX, rowY - 4).lineTo(545, rowY - 4).strokeColor('#e5e7eb').lineWidth(1).stroke();
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333');
        } else {
          doc.fontSize(9).font('Helvetica').fillColor('#666666');
        }
        const displayLabel = t.label;
        const displayValue = (t.value < 0 ? '-' : '') + Math.abs(t.value).toFixed(2);
        doc.text(displayLabel, labelX, rowY, { width: 200 });
        doc.text(displayValue, totalsX, rowY, { width: 165, align: 'right' });
        rowY += t.bold ? 22 : 16;
      }

      rowY += 10;

      if (invoice.notes) {
        doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#e5e7eb').lineWidth(1).stroke();
        rowY += 10;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text('Notes:', 50, rowY);
        rowY += 14;
        doc.fontSize(9).font('Helvetica').fillColor('#666666').text(invoice.notes, 50, rowY, { width: 495 });
        rowY += 20;
      }

      if (invoice.payments && invoice.payments.length > 0) {
        rowY = Math.max(rowY, 580);
        doc.addPage();
        rowY = 50;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text('Payments', 50, rowY);
        rowY += 24;

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666');
        doc.text('Date', 50, rowY, { width: 100 });
        doc.text('Amount', 160, rowY, { width: 80, align: 'right' });
        doc.text('Provider', 250, rowY, { width: 100 });
        doc.text('Reference', 360, rowY, { width: 100 });
        doc.text('Status', 470, rowY, { width: 75 });
        rowY += 16;

        doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#e5e7eb').lineWidth(1).stroke();
        rowY += 6;

        doc.fontSize(9).font('Helvetica').fillColor('#333333');
        for (const p of invoice.payments) {
          doc.text(new Date(p.createdAt).toLocaleDateString(), 50, rowY, { width: 100 });
          doc.text((p.amount || 0).toFixed(2), 160, rowY, { width: 80, align: 'right' });
          doc.text(p.provider || '—', 250, rowY, { width: 100 });
          doc.text(p.providerRef || '—', 360, rowY, { width: 100 });
          doc.text(p.status || '—', 470, rowY, { width: 75 });
          rowY += 16;
        }
      }

      doc.end();
    });
  }
}
