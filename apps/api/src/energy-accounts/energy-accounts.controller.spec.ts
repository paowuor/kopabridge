import { Test, TestingModule } from '@nestjs/testing';
import { EnergyAccountsController } from './energy-accounts.controller';
import { EnergyAccountsService } from './energy-accounts.service';

describe('EnergyAccountsController', () => {
  let controller: EnergyAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnergyAccountsController],
      providers: [
        {
          provide: EnergyAccountsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EnergyAccountsController>(EnergyAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
