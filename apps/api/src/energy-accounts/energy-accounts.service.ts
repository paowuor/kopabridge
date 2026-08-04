import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnergyAccountDto } from './dto/create-energy-account.dto';

// Never select the password hash when an energy account's owning user is
// embedded in a response.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EnergyAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnergyAccountDto) {
    return this.prisma.energyAccount.create({
      data: dto,
      include: {
        user: { select: SAFE_USER_SELECT },
        provider: true,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.energyAccount.findMany({
      where: { userId },
      include: {
        user: { select: SAFE_USER_SELECT },
        provider: true,
      },
    });
  }

  async findAll() {
    return this.prisma.energyAccount.findMany({
      include: {
        user: { select: SAFE_USER_SELECT },
        provider: true,
      },
    });
  }
}
