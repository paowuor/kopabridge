import { Controller, Get, Param } from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../common/utils/authorize-self-or-admin';

@Controller('credit-score')
export class CreditScoreController {
  constructor(private readonly creditScoreService: CreditScoreService) {}

  @Get(':energyAccountId')
  async calculate(
    @Param('energyAccountId') energyAccountId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    const account =
      await this.creditScoreService.findAccountOwner(energyAccountId);
    assertSelfOrAdmin(user, account.userId);
    return this.creditScoreService.calculateScore(energyAccountId);
  }
}
