import { Test, TestingModule } from '@nestjs/testing';
import { EnergyAccountsController } from './energy-accounts.controller';

describe('EnergyAccountsController', () => {
  let controller: EnergyAccountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnergyAccountsController],
    }).compile();

    controller = module.get<EnergyAccountsController>(EnergyAccountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
