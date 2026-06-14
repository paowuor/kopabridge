import { Test, TestingModule } from '@nestjs/testing';
import { EnergyAccountsService } from './energy-accounts.service';

describe('EnergyAccountsService', () => {
  let service: EnergyAccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnergyAccountsService],
    }).compile();

    service = module.get<EnergyAccountsService>(EnergyAccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
