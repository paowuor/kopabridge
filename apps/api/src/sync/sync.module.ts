import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { ProvidersModule } from '../providers/providers.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VaultModule } from '../vault/vault.module';
import { CreditScoreModule } from '../credit-score/credit-score.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'provider-sync',
    }),
    PrismaModule,
    VaultModule,
    CreditScoreModule,
    forwardRef(() => ProvidersModule),
  ],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
