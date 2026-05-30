import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { AutoAssignmentService } from './auto-assignment.service';

@Module({
  controllers: [DispatchController],
  providers: [DispatchService, AutoAssignmentService],
  exports: [DispatchService, AutoAssignmentService],
})
export class DispatchModule {}
