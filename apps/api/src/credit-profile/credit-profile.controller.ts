import { Controller, Get, Param } from '@nestjs/common';
import { CreditProfileService } from './credit-profile.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../common/utils/authorize-self-or-admin';

@Controller('credit-profile')
export class CreditProfileController {
  constructor(private readonly creditProfileService: CreditProfileService) {}

  @Get(':userId')
  getProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    assertSelfOrAdmin(user, userId);
    return this.creditProfileService.getCreditProfile(userId);
  }
}
