import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProviderRegistryService } from './provider-registry.service';
import { ProviderNormalizationService } from './provider-normalization.service';
import { ConsentsService } from '../consents/consents.service';
import { SyncService } from '../sync/sync.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { assertSelfOrAdmin } from '../common/utils/authorize-self-or-admin';
import { Public } from '../auth/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles/roles.enum';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly normalizationService: ProviderNormalizationService,
    private readonly registry: ProviderRegistryService,
    private readonly consentsService: ConsentsService,
    private readonly syncService: SyncService,
  ) {}

  // Registering a new supported provider is a platform-config action,
  // not something an end user should be able to do.
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    assertSelfOrAdmin(user, userId);
    const connector = this.registry.getConnector(slug);
    const authUrl = await connector.getAuthorizationUrl(userId);
    return {
      provider: slug,
      authUrl,
    };
  }

  // The provider's OAuth redirect hits this route directly from the
  // browser/provider side — it cannot carry our JWT, so it must stay
  // public. NOTE: this still uses hardcoded testUserId/testProviderId
  // placeholders rather than real OAuth `state`-derived identity; that's
  // a separate, pre-existing correctness bug (every callback currently
  // attaches to the same fake user/provider) and needs its own fix.
  @Public()
  @Get(':slug/callback/:code')
  @HttpCode(HttpStatus.ACCEPTED)
  async callback(@Param('slug') slug: string, @Param('code') code: string) {
    const connector = this.registry.getConnector(slug);

    const token = await connector.exchangeToken(code);

    const testUserId = 'user-123';
    const testProviderId = 'provider-uuid-abc-123';

    await this.consentsService.createConsent(testUserId, testProviderId, token);

    await this.syncService.enqueueInitialSync(
      testUserId,
      testProviderId,
      token,
    );

    return {
      status: 'accepted',
      message: 'Provider synchronization has been scheduled.',
    };
  }
}
