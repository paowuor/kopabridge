# kopabridge

# 🌉 KopaBridge

[![CI Status](https://github.com/paowuor/kopabridge/actions/workflows/ci.yml/badge.svg)](https://github.com/paowuor/kopabridge/actions/workflows)
[![Node Version](https://img.shields.io/badge/node-v24.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An enterprise-grade financial middleware and data verification layer connecting decentralized infrastructure to real-world alternative utility telemetry data streams.

Unified Energy API infrastructure for alternative credit scoring from PAYGo solar and IoT energy systems.

## Using the API

Once the stack is running, the API and its documentation are accessible directly:

- **Swagger / API docs:** http://localhost/docs (or http://localhost:3000/docs)
- **API Base:** http://localhost/api/v1 (or http://localhost:3000/api/v1)
- **Health check:** http://localhost/health (or http://localhost:3000/health)

Demo accounts (seeded by `prisma/seeds/seed.ts` when `SEED_DEMO_DATA=true` is set):

| Role  | Email                  | Password    |
|-------|------------------------|-------------|
| user  | demo@kopabridge.com    | password123 |
| admin | admin@kopabridge.com   | admin123    |

The demo user has a connected M-KOPA account with payment
history and a calculated credit score for testing endpoints. The admin account
can access administrative endpoints (e.g. `GET /api/v1/users`).

The M-KOPA connection itself is currently mocked (see `MkopaConnector`) —
connecting simulates the OAuth round trip and generates
synthetic payment history rather than calling a real M-KOPA API.

## Deployment

### Requirements

- Docker Engine and Docker Compose
- root project `.env` for Compose interpolation
- `apps/api/.env` for API runtime configuration

### Recommended local deployment

1. Create the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

2. Create the root Compose env file:

```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:

```bash
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=kopabridge
```

4. (Optional) In `apps/api/.env`, replace the dev-only `TOKEN_ENCRYPTION_KEY`
   placeholder with a freshly generated one (`openssl rand -hex 32`) if you
   plan to share this environment or run it against real data.

5. Start the stack:

```bash
docker compose up --build
```

6. Verify service availability:

- Swagger docs: http://localhost/docs (or http://localhost:3000/docs)
- Health: http://localhost/health (or http://localhost:3000/health)
- API: http://localhost:3000/api/v1

### Production compose

Use the production compose file when deploying a production-style stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

This file uses:

- `restart: unless-stopped`
- explicit production `NODE_ENV`
- root-level secret interpolation from `.env`
- `apps/api/.env` for API runtime values

### What this repository now does

- The API container's `docker-entrypoint.sh` runs `npx prisma migrate deploy` (with retries) before the application starts.
- The API configuration loader now validates required production environment values before Nest boots.

### Important production notes

- `TOKEN_ENCRYPTION_KEY` must be a 64-character hexadecimal string.
- `JWT_SECRET` and `DATABASE_URL` are required in production.
- Do not commit real secret values; keep only `.env.example` under source control.
