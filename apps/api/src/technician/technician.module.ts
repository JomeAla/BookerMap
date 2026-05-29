import { Module } from '@nestjs/common';
import { TechnicianController } from './technician.controller';

@Module({
  controllers: [TechnicianController],
})
export class TechnicianModule {}
