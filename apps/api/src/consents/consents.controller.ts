import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ConsentsService } from './consents.service';

@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get(':userId')
  findAll(@Param('userId') userId: string) {
    return this.consentsService.findActiveConsents(userId);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.consentsService.revokeConsent(id);
  }
}
