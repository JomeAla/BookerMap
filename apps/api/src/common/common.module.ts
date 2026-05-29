import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [],
})
export class CommonModule {}
