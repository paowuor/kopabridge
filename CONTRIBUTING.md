# Contributing to KopaBridge

Thank you for contributing to KopaBridge!

KopaBridge is a unified energy data infrastructure platform designed to normalize PAYGo solar and IoT financial telemetry into standardized credit intelligence APIs.

---

# Engineering Principles

We adhere to six core engineering principles across every service, module, and contribution:

### 1. Security-First Engineering
Financial and energy telemetry data is sensitive. We apply defense-in-depth:
- All endpoints are authenticated by default via global guards (`JwtAuthGuard`).
- Sensitive tokens and provider credentials must never be stored in plaintext; they must be encrypted at rest using AES-256-GCM via `VaultService`.
- Enforce strict resource ownership validation (`assertSelfOrAdmin`) on all user-scoped endpoints.
- Apply role-based access control (`RolesGuard`) for administrative endpoints.
- Rate-limit traffic globally and on sensitive authentication endpoints using `ThrottlerModule`.

### 2. Clean Architecture & Modularity
Code is organized into decoupled, domain-driven NestJS modules:
- **Controllers** handle HTTP transport, route parameter validation, and Swagger OpenAPI metadata only.
- **Services** encapsulate core business logic, domain rules, and data operations.
- **DTOs** strictly define and validate request/response payloads with `class-validator` and `class-transformer`.
- **PrismaService** abstracts database persistence.
- Cross-domain interactions occur through explicit module exports or asynchronous events, avoiding tight coupling.

### 3. Pluggable & Extensible Design
We utilize the **Adapter / Strategy / Registry** patterns to ingest data from heterogeneous PAYGo energy vendors (e.g., M-KOPA, Bboxx, Sun King). Integrating a new provider must never require altering core credit scoring or sync orchestration modules.

### 4. Maintainable & Strict TypeScript
- Zero tolerance for `any` types; prefer interfaces, generic types, and strictly defined DTOs.
- Keep functions small, focused, and single-purpose.
- Leverage NestJS Dependency Injection for all state and services to maintain testability.

### 5. Documentation-Driven Development (OpenAPI / Swagger)
APIs are first-class developer products:
- Every endpoint must be decorated with OpenAPI decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`, `@ApiTags`).
- Every DTO property must have clear `@ApiProperty()` / `@ApiPropertyOptional()` descriptions and example values.
- Self-documenting code is complemented by accurate docstrings and up-to-date documentation.

### 6. Scalable & Resilient Backend Patterns
- Long-running network tasks, third-party provider synchronization, and batch computations must not block the synchronous HTTP request-response cycle.
- Decouple heavy workloads using background job queues (BullMQ + Redis) with built-in retries, exponential backoff, and error handling.

---

# Backend Architecture & Modularity

The backend is organized as a modular NestJS monolith inside `apps/api/src`, structured by domain capabilities:

```txt
apps/api/src/
├── auth/             # Authentication, JWT strategy, roles, guards, and decorators
├── common/           # Cross-cutting filters, middleware, and authorization helpers
├── config/           # Centralized configuration and runtime environment validation
├── consents/         # Provider data consent lifecycle and authorization tracking
├── credit-profile/   # Aggregated credit profiles for downstream lenders
├── credit-score/     # Alternative credit scoring calculation engines
├── energy-accounts/  # Customer PAYGo energy account records and linkage
├── health/           # Liveness and readiness health probes
├── metrics/          # Prometheus metrics collection and MetricsAuthGuard
├── payments/         # Payment history ingestion and transaction records
├── prisma/           # Prisma ORM client abstraction and lifecycle management
├── providers/        # Pluggable provider connectors, normalizers, and registry
├── sync/             # Asynchronous BullMQ background worker and synchronization queues
├── users/            # User account management and profile resolution
└── vault/            # Cryptographic token encryption (AES-256-GCM)
```

### Module Boundary Guidelines

- **Encapsulate internals**: Only export services that other modules legitimately need to consume.
- **Avoid circular dependencies**: Where bidirectional awareness is required (e.g. between `ProvidersModule` and `SyncModule`), use NestJS `forwardRef()` cautiously and document the reason.
- **Isolate shared helpers**: Place cross-cutting logic (e.g., error filters, logging middleware, security assertion utilities) in `src/common/`.

---

# Pluggable Provider Architecture

KopaBridge normalizes telemetry from various energy providers into a unified schema. When adding a new PAYGo or IoT provider, follow this four-step integration process:

### 1. Implement `ProviderConnector`
Create `apps/api/src/providers/connectors/<provider-slug>.connector.ts` implementing the `ProviderConnector` interface:

```typescript
export interface ProviderConnector {
  getAuthorizationUrl(userId: string, state: string): Promise<string>;
  exchangeToken(code: string): Promise<string>;
  fetchCustomerData(accessToken: string): Promise<any>;
}
```

### 2. Implement `ProviderNormalizer`
Create `apps/api/src/providers/normalizers/<provider-slug>.normalizer.ts` implementing `ProviderNormalizer` to map vendor-specific telemetry into the standard `NormalizedProviderData` DTO:

```typescript
export interface ProviderNormalizer {
  normalize(rawVendorData: any): NormalizedProviderData;
}
```

The normalized output standardizes:
- Energy account metadata (account number, provider, status)
- Payment history (timestamps, amounts, transaction references)
- Device telemetry (install date, capacity, status)

### 3. Register in Registry Services
- Register the connector in `ProviderRegistryService` ([`provider-registry.service.ts`](file:///home/paowuor/kopabridge/apps/api/src/providers/provider-registry.service.ts)).
- Register the normalizer in `ProviderNormalizationService` ([`provider-normalization.service.ts`](file:///home/paowuor/kopabridge/apps/api/src/providers/provider-normalization.service.ts)).
- Add the provider and its dependencies to `ProvidersModule` providers.

### 4. Provide Tests & Seeds
- Include comprehensive unit tests for both the connector and normalizer.
- Add sample seed data or mock responses in `prisma/seeds/seed.ts` for local testing.

---

# Asynchronous Processing & Job Queues

Background workflows (such as provider data synchronization and periodic telemetry refreshes) run through **BullMQ** on Redis.

- **Queue Separation**: Sync jobs are dispatched onto the `provider-sync` queue.
- **Worker Processors**: Handled by `SyncProcessor` ([`apps/api/src/sync/sync.processor.ts`](file:///home/paowuor/kopabridge/apps/api/src/sync/sync.processor.ts)) outside the HTTP request lifecycle.
- **Job Reliability**: Always specify job options including retry attempts, exponential backoff, and failure logging:
  ```typescript
  await this.syncQueue.add(
    'sync-provider-data',
    { consentId, userId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    },
  );
  ```
- **Error Handling**: Worker failures must be captured, logged, and reflected in the database consent sync status (`FAILED` / `SYNCED`).

---

# Security & Authorization Standards

KopaBridge handles sensitive financial intelligence and energy telemetry. Adhere strictly to these security requirements:

### 1. Default-Authenticated Routing
Every route is protected by `JwtAuthGuard` globally in `AppModule`.
- To make an endpoint publicly accessible (e.g., login, register, health check), explicitly apply `@Public()`.
- Never disable or bypass global guards.

### 2. Resource Ownership Validation
When an endpoint takes a `userId` or resource ID belonging to a specific user, verify resource ownership using `assertSelfOrAdmin`:

```typescript
assertSelfOrAdmin(currentUser, targetUserId);
```

This prevents IDOR (Insecure Direct Object Reference) vulnerabilities by ensuring regular users can only read and write their own data, while users with the `ADMIN` role retain operational access.

### 3. Role-Based Access Control (RBAC)
Protect administrative routes using `@Roles(Role.ADMIN)`:

```typescript
@Roles(Role.ADMIN)
@Get('users')
async findAllUsers() { ... }
```

### 4. Encryption at Rest (`VaultService`)
- Sensitive OAuth tokens (access tokens, refresh tokens) and customer credentials must never be written to the database in plaintext.
- Use `VaultService.encrypt(plainText)` before database writes and `VaultService.decrypt(cipherText)` upon read.
- `TOKEN_ENCRYPTION_KEY` must be a 64-character hexadecimal string (32 bytes).

### 5. Rate Limiting
Global rate limiting is enforced via `ThrottlerModule` (default: 300 requests / 60 seconds). For sensitive endpoints (e.g. auth login, registration), apply tighter route-level throttlers:

```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(...) { ... }
```

### 6. Secrets and Environment Variables
- Never commit `.env`, private keys, API credentials, or secrets to Git.
- Always add newly introduced environment variables to `.env.example` and `apps/api/.env.example` with descriptive placeholder comments.
- Validate configuration variables on application startup in `apps/api/src/config/app.config.ts`.

---

# API & Swagger Documentation Standards

All APIs must be designed API-first with full Swagger / OpenAPI documentation.

### REST Conventions
- Use resource-based URLs with plural nouns:
  ```txt
  GET    /api/v1/energy-accounts
  POST   /api/v1/energy-accounts
  GET    /api/v1/energy-accounts/:id
  PATCH  /api/v1/energy-accounts/:id
  DELETE /api/v1/energy-accounts/:id
  ```
- All routes must be versioned under the `/api/v1` prefix.

### OpenAPI / Swagger Decorators
Every controller must include:
- `@ApiTags('Domain Name')` on the class.
- `@ApiBearerAuth('JWT-auth')` for protected routes.
- `@ApiOperation({ summary: '...' })` describing the endpoint purpose.
- `@ApiResponse()` for all expected status codes (`200`/`201`, `400`, `401`, `403`, `404`).

Every DTO property must include:
- Validation decorators (`@IsString()`, `@IsNotEmpty()`, `@IsUUID()`, `@IsEmail()`, etc.).
- `@ApiProperty({ description: '...', example: '...' })` or `@ApiPropertyOptional()`.

---

# TypeScript Standards

### Required Practices
- **Strict Typing**: Specify explicit types for function parameters, return values, and variables. Avoid implicit `any`.
- **DTOs for All I/O**: Use DTO classes for request bodies, query parameters, and structured responses.
- **Dependency Injection**: Inject dependencies through class constructors; do not instantiate service classes manually.
- **Single Responsibility**: Keep files and functions modular, focused, and under reasonable line counts.

### Prohibited Patterns
- **No business logic in controllers**: Controllers must only receive requests, delegate to services, and return responses.
- **No raw database queries outside Prisma**: Use Prisma Client via `PrismaService`.
- **No unhandled promises or empty catch blocks**: Ensure every asynchronous call has error propagation or structured logging.

---

# Testing Expectations

Every feature or fix must include automated tests:

### 1. Unit Tests
- Co-locate unit tests alongside their source files using the `*.spec.ts` naming convention.
- Unit test all services, controllers, guards, normalizers, and processors.
- Mock all external dependencies (Prisma, VaultService, BullMQ queues, external APIs).

### 2. End-to-End (E2E) Tests
- Place integration and E2E tests in `apps/api/test/`.
- Validate full request-response lifecycles, authentication flows, and permission enforcement.

### 3. Running Tests
Run test suites locally or via Docker:

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run test coverage analysis
npm run test:cov

# Run E2E tests
npm run test:e2e
```

---

# Code Style & Quality

### Linters & Formatters
This project strictly enforces formatting and linting rules using **Prettier** and **ESLint**.

### Pre-Commit Workflow
Before committing, always run the format and lint scripts inside `apps/api`:

```bash
npm run format
npm run lint
```

Make sure there are zero lint errors and formatting violations before committing.

---

# Development Workflow

### Branch Strategy
Never commit directly to `main` or `develop`. Create descriptive feature branches from `develop`:

```bash
feature/provider-bboxx-connector
feature/credit-score-refinement
fix/token-refresh-expiry
docs/api-consent-flow
refactor/vault-service
```

### Commit Message Convention
We adhere to **Conventional Commits**:

```bash
type(scope): description
```

#### Allowed Types
- `feat`: New feature or capability
- `fix`: Bug fix
- `docs`: Documentation updates
- `refactor`: Code refactoring without behavioral changes
- `chore`: Tooling, build config, dependency bumps
- `test`: Adding or updating test suites
- `perf`: Performance optimizations

#### Examples
```bash
feat(providers): implement Bboxx connector and normalizer
fix(auth): handle expired refresh token gracefully
docs(contributing): clarify pluggable connector architecture
test(vault): add test cases for corrupted ciphertext decryption
```

---

# Pull Requests

Before submitting a Pull Request:
1. Verify code formatting: `npm run format`
2. Verify zero lint errors: `npm run lint`
3. Ensure all unit and E2E tests pass: `npm run test`
4. Ensure Swagger annotations are added or updated for API changes.
5. Provide a clear description in the PR detailing:
   - What changes were made and why
   - Any new environment variables introduced
   - How to manually verify or test the changes
   - Impact on database migrations (if applicable)

---

# Architecture Goals

KopaBridge is designed as:
- **API-First Infrastructure**: Clean, predictable developer experience for fintechs and micro-lenders.
- **Fintech-Grade Security**: Cryptographically verified, audited data access with end-to-end token encryption.
- **Multi-Provider Normalization**: Standardized energy IoT schema abstracting vendor fragmentation across Africa and emerging markets.
- **Consent-Driven Interoperability**: User sovereignty over energy and payment history data sharing.