import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProviderRegistryService } from './provider-registry.service';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly registry: ProviderRegistryService,
  ) {}

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.providersService.create(dto);
  }

  @Get()
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':slug/connect/:userId')
  async connect(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
  ) {
    const connector = this.registry.getConnector(slug);
    const authUrl = await connector.getAuthorizationUrl(userId);
    return {
      provider: slug,
      authUrl,
    };
  }

  @Get(':slug/callback/:code')
  async callback(
    @Param('slug') slug: string,
    @Param('code') code: string,
  ) {
    const connector = this.registry.getConnector(slug);

    const token = await connector.exchangeToken(code);

    const data = await connector.fetchCustomerData(token);

    return data;
  }
}