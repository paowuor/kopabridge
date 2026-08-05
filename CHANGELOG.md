# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Customer portal (`apps/web/`)** — a plain HTML/JS/CSS frontend, served
  directly by nginx alongside the API. Covers register/login, connecting a
  (mocked) M-KOPA account, viewing energy accounts, and a credit score
  view rendered as a segmented meter. An admin view lists all users,
  energy accounts, and recent payments platform-wide.
- Seeded demo admin account (`admin@kopabridge.com` / `admin123`) so the
  admin view is demoable without manual setup.
- Global authentication by default: `JwtAuthGuard` now runs on every route
  unless explicitly opted out with `@Public()`.
- Ownership checks (`assertSelfOrAdmin`) on `consents`, `credit-profile`,
  `credit-score`, `energy-accounts`, and provider `connect` — a logged-in
  user can no longer read another user's data by guessing an ID.
- Signed, short-lived OAuth `state` tokens (`OAuthStateService`) binding
  the provider connect request to the initiating user, replacing hardcoded
  placeholder IDs in the OAuth callback.
- Real background sync pipeline: `SyncProcessor` now loads the active
  consent, decrypts the token, fetches and normalizes provider data, and
  upserts energy accounts / payment history / credit score — previously a
  no-op stub.
- `helmet` security headers and configurable CORS (`CORS_ORIGIN`), both
  previously declared but never wired into the app.
- Database indexes on previously-unindexed foreign key columns
  (`EnergyAccount.userId/providerId`, `PaymentHistory.energyAccountId`,
  `ProviderConsent.userId+revoked/providerId`).
- Global `api/v1` route prefix, applied consistently across all
  controllers (`health` and `metrics` excluded, since they're
  monitoring/ops endpoints rather than versioned public API).

### Fixed
- Mock M-KOPA connector previously returned the same static account
  number for every user, meaning a second real user connecting would
  silently attach to the first user's energy account and payment
  history. Fixed to derive a distinct mock account number per connection.
- `POST /users` no longer stores passwords in plaintext.
- `GET /users` no longer returns password hashes, and is now admin-only.
- Duplicate `GET /health` route (defined in both `AppController` and
  `HealthController`) consolidated into the single Terminus-backed check.
- `.env.example` updated to match the environment variables the app
  actually reads (was referencing `ENCRYPTION_KEY`/`REDIS_URL`, which
  don't exist in the code; the app reads `TOKEN_ENCRYPTION_KEY` and
  `REDIS_HOST`/`REDIS_PORT`).
- Plaintext OAuth access tokens no longer pass through the Redis job
  queue or get logged — the sync worker re-reads and decrypts the token
  from the database instead.

### Known limitations (tracked for v1.1+)
- The M-KOPA connector is still a mock; no real provider integration yet.
- No rate limiting on `/auth/login` or `/auth/register`.
- No refresh-token / consent-renewal flow.

## [1.0.0] - Unreleased

Initial MVP scope: user authentication, provider management, consent
management, mocked OAuth flow, provider connectors, data normalization,
credit score calculation, unified credit profile, background
synchronization, Docker deployment, monitoring foundation.
