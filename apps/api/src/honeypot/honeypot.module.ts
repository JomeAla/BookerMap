import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HoneypotController } from './honeypot.controller';
import { HoneypotService } from './honeypot.service';
import { HoneypotMiddleware } from './honeypot.middleware';
import { AuthController } from '../auth/auth.controller';
import { PublicController } from '../public/public.controller';
import { AiAgentController } from '../ai-agent/ai-agent.controller';

@Module({
  controllers: [HoneypotController],
  providers: [HoneypotService],
  exports: [HoneypotService],
})
export class HoneypotModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HoneypotMiddleware)
      .forRoutes(AuthController, PublicController, AiAgentController);
  }
}