import { Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { WebhookModule } from '../webhook/webhook.module';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceController } from './invoice.controller';

@Module({
  imports: [NotificationModule, forwardRef(() => WebhookModule)],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
