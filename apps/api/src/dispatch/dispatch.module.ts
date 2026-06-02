import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { AutoAssignmentService } from './auto-assignment.service';

@Module({
  imports: [GatewayModule],
  controllers: [DispatchController],
  providers: [DispatchService, AutoAssignmentService],
  exports: [DispatchService, AutoAssignmentService],
})
export class DispatchModule {}
