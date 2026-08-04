import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface OAuthStatePayload {
  userId: string;
  providerId: string;
  slug: string;
}

interface SignedOAuthState extends OAuthStatePayload {
  typ: 'oauth_state';
}

/**
 * Signs/verifies the `state` parameter used in the provider OAuth
 * handshake. Binding userId + providerId + slug into a short-lived,
 * tamper-evident token means the callback no longer has to trust a
 * hardcoded or client-supplied identity — it trusts only what was signed
 * at the start of the flow the user themselves initiated.
 */
@Injectable()
export class OAuthStateService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: OAuthStatePayload): string {
    const claims: SignedOAuthState = { ...payload, typ: 'oauth_state' };
    return this.jwtService.sign(claims);
  }

  verify(state: string, expectedSlug: string): OAuthStatePayload {
    let decoded: SignedOAuthState;

    try {
      decoded = this.jwtService.verify<SignedOAuthState>(state);
    } catch {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    // Defense in depth: reject tokens that aren't actually oauth_state
    // tokens (e.g. a login JWT signed with the same secret) and reject
    // state minted for a different provider slug than the callback URL.
    if (decoded.typ !== 'oauth_state' || decoded.slug !== expectedSlug) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    return {
      userId: decoded.userId,
      providerId: decoded.providerId,
      slug: decoded.slug,
    };
  }
}
