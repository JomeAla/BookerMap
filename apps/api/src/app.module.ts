import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { CustomerModule } from './customer/customer.module';
import { ServiceModule } from './service/service.module';
import { TerritoryModule } from './territory/territory.module';
import { BookingModule } from './booking/booking.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { TechnicianModule } from './technician/technician.module';
import { RoutingModule } from './routing/routing.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { NotificationModule } from './notification/notification.module';
import { ReportsModule } from './reports/reports.module';
import { RecurringBookingModule } from './recurring-booking/recurring-booking.module';
import { CouponModule } from './coupon/coupon.module';
import { WebhookModule } from './webhook/webhook.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { LocationModule } from './location/location.module';
import { ReviewModule } from './review/review.module';
import { PublicModule } from './public/public.module';
import { PortalModule } from './portal/portal.module';
import { PricingModule } from './pricing/pricing.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MarketingModule } from './marketing/marketing.module';
import { FilesModule } from './files/files.module';
import { CommissionModule } from './commission/commission.module';
import { SplitPaymentModule } from './split-payment/split-payment.module';
import { SettlementModule } from './settlement/settlement.module';
import { InventoryModule } from './inventory/inventory.module';
import { SatisfactionModule } from './satisfaction/satisfaction.module';
import { DisputeModule } from './dispute/dispute.module';
import { CommonModule } from './common/common.module';
import { PublicApiModule } from './public-api/public-api.module';
import { HealthModule } from './health/health.module';
import { DomainResolverMiddleware } from './common/middleware/domain-resolver.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    TenantModule,
    UserModule,
    CustomerModule,
    ServiceModule,
    TerritoryModule,
    BookingModule,
    DispatchModule,
    InvoiceModule,
    PaymentModule,
    AiAgentModule,
    NotificationModule,
    WebhookModule,
    TechnicianModule,
    RoutingModule,
    ReportsModule,
    RecurringBookingModule,
    CouponModule,
    GoogleCalendarModule,
    LocationModule,
    ReviewModule,
    PublicModule,
    PortalModule,
    SubscriptionModule,
    PricingModule,
    MarketingModule,
    FilesModule,
    CommissionModule,
    SplitPaymentModule,
    SettlementModule,
    InventoryModule,
    SatisfactionModule,
    DisputeModule,
    PublicApiModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DomainResolverMiddleware)
      .forRoutes('public');
  }
}
