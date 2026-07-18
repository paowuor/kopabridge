import { Test, TestingModule } from '@nestjs/testing';
import { CreditProfileController } from './credit-profile.controller';
import { CreditProfileService } from './credit-profile.service';

describe('CreditProfileController', () => {
  let controller: CreditProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditProfileController],
      providers: [
        {
          provide: CreditProfileService,
          useValue: {
            getCreditProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CreditProfileController>(CreditProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
