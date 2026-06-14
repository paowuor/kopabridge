import { Module } from '@nestjs/common';
import { EnergyAccountsController } from './energy-accounts.controller';
import { EnergyAccountsService } from './energy-accounts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EnergyAccountsController],
  providers: [EnergyAccountsService],
})
export class EnergyAccountsModule {}