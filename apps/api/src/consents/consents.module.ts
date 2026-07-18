import { Module } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [PrismaModule, VaultModule],
  providers: [ConsentsService],
  controllers: [ConsentsController],
  exports: [ConsentsService],
})
export class ConsentsModule {}
