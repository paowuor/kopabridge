import { Body, Controller, Get, Post } from '@nestjs/common';
import { EnergyAccountsService } from './energy-accounts.service';
import { CreateEnergyAccountDto } from './dto/create-energy-account.dto';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../common/utils/authorize-self-or-admin';
import { Role } from '../auth/roles/roles.enum';

@Controller('energy-accounts')
export class EnergyAccountsController {
  constructor(private readonly energyAccountsService: EnergyAccountsService) {}

  @Post()
  create(
    @Body() dto: CreateEnergyAccountDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    // A user may only create an energy account under their own userId
    // unless they're an admin (e.g. onboarding on a customer's behalf).
    assertSelfOrAdmin(user, dto.userId);
    return this.energyAccountsService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser | undefined) {
    // Non-admins only ever see their own energy accounts.
    if (user?.role === Role.ADMIN) {
      return this.energyAccountsService.findAll();
    }
    return this.energyAccountsService.findAllForUser(user?.userId ?? '');
  }
}
