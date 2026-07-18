import { Module } from '@nestjs/common';
import { CreditScoreController } from './credit-score.controller';
import { CreditScoreService } from './credit-score.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditScoreController],
  providers: [CreditScoreService],
  exports: [CreditScoreService],
})
export class CreditScoreModule {}
