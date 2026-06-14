import { Module } from '@nestjs/common';
import { CreditProfileController } from './credit-profile.controller';
import { CreditProfileService } from './credit-profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditScoreModule } from '../credit-score/credit-score.module';

@Module({
  imports: [PrismaModule, CreditScoreModule],
  controllers: [CreditProfileController],
  providers: [CreditProfileService],
})
export class CreditProfileModule {}