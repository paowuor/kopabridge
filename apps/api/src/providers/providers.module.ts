import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MkopaConnector } from './connectors/mkopa.connector';
import { ProviderRegistryService } from './provider-registry.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, MkopaConnector, ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProvidersModule {}