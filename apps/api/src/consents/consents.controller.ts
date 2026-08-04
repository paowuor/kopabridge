import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../common/utils/authorize-self-or-admin';

@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get(':userId')
  async findAll(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    assertSelfOrAdmin(user, userId);
    return this.consentsService.findActiveConsents(userId);
  }

  @Patch(':id/revoke')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    const consent = await this.consentsService.findConsentOwner(id);
    assertSelfOrAdmin(user, consent.userId);
    return this.consentsService.revokeConsent(id);
  }
}
