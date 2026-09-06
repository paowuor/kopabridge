import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MkopaConnector } from './connectors/mkopa.connector';
import { ProviderRegistryService } from './provider-registry.service';
import { MkopaNormalizer } from './normalizers/mkopa.normalizer';
import { ProviderNormalizationService } from './provider-normalization.service';
import { ConsentsModule } from '../consents/consents.module';
import { SyncModule } from '../sync/sync.module';
import { OAuthStateService } from './oauth-state.service';

@Module({
  imports: [
    PrismaModule,
    ConsentsModule,
    forwardRef(() => SyncModule),
    // Dedicated, short-lived token for the OAuth `state` param — kept
    // separate from the long-lived login JWT issued by AuthModule.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    MkopaConnector,
    ProviderRegistryService,
    MkopaNormalizer,
    ProviderNormalizationService,
    OAuthStateService,
  ],
  exports: [ProviderRegistryService, ProviderNormalizationService],
})
export class ProvidersModule {}
