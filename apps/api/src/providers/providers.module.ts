import { Module, forwardRef } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MkopaConnector } from './connectors/mkopa.connector';
import { ProviderRegistryService } from './provider-registry.service';
import { MkopaNormalizer } from './normalizers/mkopa.normalizer';
import { ProviderNormalizationService } from './provider-normalization.service';
import { ConsentsModule } from '../consents/consents.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    PrismaModule,
    ConsentsModule,
    forwardRef(() => SyncModule),
  ],
  controllers: [ProvidersController],
  providers: [
    ProvidersService, 
    MkopaConnector, 
    ProviderRegistryService,
    MkopaNormalizer,
    ProviderNormalizationService,
  ],
  exports: [ProviderRegistryService, ProviderNormalizationService],
})
export class ProvidersModule {}