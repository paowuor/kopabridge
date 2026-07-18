import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ProviderNormalizationService } from './provider-normalization.service';
import { ProviderRegistryService } from './provider-registry.service';
import { ConsentsService } from '../consents/consents.service';
import { SyncService } from '../sync/sync.service';

describe('ProvidersController', () => {
  let controller: ProvidersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: ProvidersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: ProviderNormalizationService,
          useValue: {
            normalize: jest.fn(),
          },
        },
        {
          provide: ConsentsService,
          useValue: {
            createConsent: jest.fn(),
            revokeConsent: jest.fn(),
            findActiveConsents: jest.fn(),
          },
        },
        {
          provide: ProviderRegistryService,
          useValue: {
            getConnector: jest.fn(),
          },
        },
        {
          provide: SyncService,
          useValue: {
            enqueueInitialSync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
