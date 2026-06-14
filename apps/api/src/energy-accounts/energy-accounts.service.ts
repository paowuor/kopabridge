import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnergyAccountDto } from './dto/create-energy-account.dto';

@Injectable()
export class EnergyAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnergyAccountDto) {
    return this.prisma.energyAccount.create({
      data: dto,
      include: {
        user: true,
        provider: true,
      },
    });
  }

  async findAll() {
    return this.prisma.energyAccount.findMany({
      include: {
        user: true,
        provider: true,
      },
    });
  }
}