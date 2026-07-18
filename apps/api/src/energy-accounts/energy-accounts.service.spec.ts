import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { EnergyAccountsService } from './energy-accounts.service';

describe('EnergyAccountsService', () => {
  let service: EnergyAccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyAccountsService,
        {
          provide: PrismaService,
          useValue: {
            energyAccount: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EnergyAccountsService>(EnergyAccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
