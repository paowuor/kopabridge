import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { ProvidersModule } from './providers/providers.module';
import { EnergyAccountsModule } from './energy-accounts/energy-accounts.module';
import { PaymentsModule } from './payments/payments.module';
import { CreditScoreModule } from './credit-score/credit-score.module';
import { CreditProfileModule } from './credit-profile/credit-profile.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ConsentsModule } from './consents/consents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
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