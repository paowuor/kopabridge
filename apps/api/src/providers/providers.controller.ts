import { Body, Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderNormalizationService } from './provider-normalization.service'; 
import { ConsentsService } from '../consents/consents.service';
import { SyncService } from '../sync/sync.service';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly normalizationService: ProviderNormalizationService,
    private readonly registry: ProviderRegistryService,
    private readonly consentsService: ConsentsService,
    private readonly syncService: SyncService,
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
  @HttpCode(HttpStatus.ACCEPTED)
  async callback(
    @Param('slug') slug: string,
    @Param('code') code: string,
  ) {
    const connector = this.registry.getConnector(slug);

    const token = await connector.exchangeToken(code);

    const testUserId = 'user-123';
    const testProviderId = 'provider-uuid-abc-123';

    await this.consentsService.createConsent(
      testUserId,
      testProviderId,
      token,
    );

    await this.syncService.enqueueInitialSync(testUserId, testProviderId, token);

    return {
      status: 'accepted',
      message: 'Provider synchronization has been scheduled.',
    };
  }
}