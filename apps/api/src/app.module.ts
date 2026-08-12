import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ProvidersModule } from './providers/providers.module';
import { EnergyAccountsModule } from './energy-accounts/energy-accounts.module';
import { PaymentsModule } from './payments/payments.module';
import { CreditScoreModule } from './credit-score/credit-score.module';
import { CreditProfileModule } from './credit-profile/credit-profile.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ConsentsModule } from './consents/consents.module';
import { VaultModule } from './vault/vault.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Support either a full Redis URL (e.g. from Railway) or host/port
        // environment variables for local/docker setups.
        ...(configService.get<string>('redis.url')
          ? { connection: { url: configService.get<string>('redis.url') } }
          : {
              connection: {
                host: configService.get<string>('redis.host'),
                port: configService.get<number>('redis.port'),
              },
            }),
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    PrismaModule,
    AuthModule,
    ProvidersModule,
    EnergyAccountsModule,
    PaymentsModule,
    CreditScoreModule,
    CreditProfileModule,
    ConsentsModule,
    VaultModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: JwtAuthGuard runs first so req.user is populated
    // before RolesGuard checks role metadata. Every route is
    // authenticated by default — opt out with @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
