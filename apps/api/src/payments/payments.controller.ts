import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/roles.enum';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Payment records feed directly into the credit score, so they must
  // come from a trusted source (provider sync) rather than any logged-in
  // user — otherwise a user could fabricate their own payment history.
  // Restricted to ADMIN until real provider-driven ingestion replaces
  // this manual endpoint.
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (user?.role === Role.ADMIN) {
      return this.paymentsService.findAll();
    }
    return this.paymentsService.findAllForUser(user?.userId ?? '');
  }
}
