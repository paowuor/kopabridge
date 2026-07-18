import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { ConsentsService } from './consents.service';

describe('ConsentsService', () => {
  let service: ConsentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        {
          provide: PrismaService,
          useValue: {
            providerConsent: {
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: VaultService,
          useValue: {
            encrypt: jest.fn().mockReturnValue('encrypted'),
            decrypt: jest.fn().mockReturnValue('decrypted'),
          },
        },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
