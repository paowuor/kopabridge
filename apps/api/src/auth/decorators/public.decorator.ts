import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as not requiring authentication.
 * Use sparingly — only for routes that genuinely must be reachable without
 * a JWT (registration, login, health checks, metrics, external OAuth
 * redirects, etc). Everything else is authenticated by default via the
 * global JwtAuthGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
