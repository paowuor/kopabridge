import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret: string | undefined = configService.get<string>('jwt.secret');

    // `ExtractJwt` and `ConfigService.get` aren't resolved to a concrete type
    // by the linter, and `secret` flows into Passport's options object, so
    // disable the unsafe-* rules for this known-safe configuration block.
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
  }

  /**
   * Re-reads the account on every authenticated request.
   *
   * The access token is valid for 15 minutes, so trusting the `role` claim
   * alone would let a deactivated, soft-deleted, or demoted account keep full
   * access until the token expired. The token proves *who* is calling; the
   * database decides *what they may now do*. `select` keeps the per-request
   * query to the five columns this decision needs.
   *
   * Cost: one indexed primary-key lookup per authenticated request.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.isActive === false) {
      throw new UnauthorizedException('Account is no longer active.');
    }

    return {
      userId: user.id,
      email: user.email,
      // Authoritative from the DB, not the token: revoking a role takes
      // effect on the very next request instead of at token expiry.
      role: user.role,
    };
  }
}
