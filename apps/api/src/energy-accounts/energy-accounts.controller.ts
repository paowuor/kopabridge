import { Body, Controller, Get, Post } from '@nestjs/common';
import { EnergyAccountsService } from './energy-accounts.service';
import { CreateEnergyAccountDto } from './dto/create-energy-account.dto';

@Controller('energy-accounts')
export class EnergyAccountsController {
  constructor(private readonly energyAccountsService: EnergyAccountsService) {}

  @Post()
  create(@Body() dto: CreateEnergyAccountDto) {
    return this.energyAccountsService.create(dto);
  }

  @Get()
  findAll() {
    return this.energyAccountsService.findAll();
  }
}
