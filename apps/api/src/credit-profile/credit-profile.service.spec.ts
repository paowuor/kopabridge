import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { CreditProfileService } from './credit-profile.service';

describe('CreditProfileService', () => {
  let service: CreditProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditProfileService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: CreditScoreService,
          useValue: {
            calculateScore: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreditProfileService>(CreditProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
