import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { DomainService } from './domain.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, DomainService],
  exports: [TenantService, DomainService],
})
export class TenantModule {}
