import { CookieOptions } from 'express';

export const REFRESH_COOKIE_NAME = 'kopabridge_refresh_token';

/**
 * Returns security-hardened options for the refresh token cookie.
 * - httpOnly: Inaccessible to JavaScript (XSS mitigation).
 * - secure: Enforces HTTPS transmission in production.
 * - sameSite: 'strict' in production to mitigate CSRF; 'lax' in development for localhost flexibility.
 * - path: Scoped specifically to '/api/v1/auth' so cookie is not transmitted to unrelated API routes.
 * - maxAge: 7 days, matching the database refresh token TTL.
 */
export function getRefreshCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Returns options for clearing the refresh token cookie on session logout.
 */
export function getClearRefreshCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth',
  };
}
