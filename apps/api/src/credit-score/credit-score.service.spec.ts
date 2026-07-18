import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreditScoreService } from './credit-score.service';

describe('CreditScoreService', () => {
  let service: CreditScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditScoreService,
        {
          provide: PrismaService,
          useValue: {
            energyAccount: {
              findUnique: jest.fn(),
            },
            paymentHistory: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CreditScoreService>(CreditScoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
