import { Controller, Get, Param } from '@nestjs/common';
import { CreditProfileService } from './credit-profile.service';

@Controller('api/v1/credit-profile')
export class CreditProfileController {
  constructor(private readonly creditProfileService: CreditProfileService) {}

  @Get(':userId')
  getProfile(@Param('userId') userId: string) {
    return this.creditProfileService.getCreditProfile(userId);
  }
}
