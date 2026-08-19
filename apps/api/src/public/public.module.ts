import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { CustomerOtpService } from './customer-otp.service';
import { CustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { CustomerJwtStrategy } from '../auth/customer-jwt.strategy';

@Module({
  imports: [
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'super-secret-jwt-key-change-in-production',
        signOptions: {
          expiresIn: '30d',
        },
      }),
    }),
  ],
  controllers: [PublicController],
  providers: [PublicService, CustomerOtpService, CustomerJwtAuthGuard, CustomerJwtStrategy],
  exports: [CustomerJwtAuthGuard],
})
export class PublicModule {}