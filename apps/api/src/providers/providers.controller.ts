import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
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
import { OAuthStateService } from './oauth-state.service';
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
    private readonly oauthStateService: OAuthStateService,
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

    // Resolve the provider row up front — the id becomes part of the
    // signed state so the callback doesn't have to trust anything the
    // caller sends.
    const provider = await this.providersService.findBySlug(slug);
    const connector = this.registry.getConnector(slug);

    const state = this.oauthStateService.sign({
      userId,
      providerId: provider.id,
      slug,
    });

    const authUrl = await connector.getAuthorizationUrl(userId, state);
    return {
      provider: slug,
      authUrl,
    };
  }

  // The provider's OAuth redirect hits this route directly from the
  // browser/provider side — it cannot carry our JWT, so it must stay
  // public. Identity/authorization instead comes from the signed `state`
  // token minted in connect() above: it's verified here, so the userId
  // and providerId used to record consent and enqueue sync are exactly
  // the ones the authenticated caller requested — not caller-supplied
  // and not hardcoded.
  @Public()
  @Get(':slug/callback/:code')
  @HttpCode(HttpStatus.ACCEPTED)
  async callback(
    @Param('slug') slug: string,
    @Param('code') code: string,
    @Query('state') state: string,
  ) {
    const { userId, providerId } = this.oauthStateService.verify(state, slug);

    const connector = this.registry.getConnector(slug);
    const token = await connector.exchangeToken(code);

    await this.consentsService.createConsent(userId, providerId, token);

    await this.syncService.enqueueInitialSync(userId, providerId);

    return {
      status: 'accepted',
      message: 'Provider synchronization has been scheduled.',
    };
  }
}
