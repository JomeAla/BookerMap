import { Module } from '@nestjs/common';
import { SatisfactionController } from './satisfaction.controller';
import { SatisfactionService } from './satisfaction.service';
import { SentimentService } from './sentiment.service';

@Module({
  controllers: [SatisfactionController],
  providers: [SatisfactionService, SentimentService],
  exports: [SatisfactionService, SentimentService],
})
export class SatisfactionModule {}
