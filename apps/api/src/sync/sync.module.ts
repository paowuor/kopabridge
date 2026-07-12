import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { ProvidersModule } from '../providers/providers.module'; 

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'provider-sync',
    }),
    forwardRef(() => ProvidersModule), 
  ],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}