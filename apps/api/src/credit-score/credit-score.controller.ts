import { Controller, Get, Param } from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';

@Controller('credit-score')
export class CreditScoreController {
  constructor(private readonly creditScoreService: CreditScoreService) {}

  @Get(':energyAccountId')
  calculate(@Param('energyAccountId') energyAccountId: string) {
    return this.creditScoreService.calculateScore(energyAccountId);
  }
}