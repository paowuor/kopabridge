# kopabridge

# 🌉 KopaBridge

[![CI Status](https://github.com/paowuor/kopabridge/actions/workflows/ci.yml/badge.svg)](https://github.com/paowuor/kopabridge/actions/workflows)
[![Node Version](https://img.shields.io/badge/node-v24.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An enterprise-grade financial middleware and data verification layer connecting decentralized infrastructure to real-world alternative utility telemetry data streams.

Unified Energy API infrastructure for alternative credit scoring from PAYGo solar and IoT energy systems.

## Using the app

Once the stack is running, the customer portal is served directly at the
root domain — no separate frontend deployment needed:

- **Customer portal:** http://localhost/ — register or sign in, connect a
  (mocked) M-KOPA account, and see a live credit score.
- **Swagger / API docs:** http://localhost/docs
- **Health check:** http://localhost/health

Demo accounts (seeded by `prisma/seeds/seed.ts`):

| Role  | Email                  | Password    |
|-------|------------------------|-------------|
| user  | demo@kopabridge.com    | password123 |
| admin | admin@kopabridge.com   | admin123    |

The demo user already has a connected M-KOPA account with payment
history and a calculated credit score, so the dashboard has something to
show immediately. Signing in as the admin account surfaces an **Admin**
link to a platform-wide view of all users, energy accounts, and recent
payments.

The M-KOPA connection itself is currently mocked (see `MkopaConnector`) —
clicking "Connect M-KOPA" simulates the OAuth round trip and generates
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

2. Create the root Compose env example:

```bash
cp .env.example .env
```
```

### Troubleshooting & quick checks

The customer portal is served at `/`, the API lives under `/api/v1`, and
docs are at `/docs`.

Check running containers and follow logs:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f nginx
```

Test the API endpoints:

```bash
curl -i http://localhost/
curl -i http://localhost/docs
curl -i http://localhost/health
curl -i http://localhost/api/v1/providers
```

Check Postgres from the `postgres` container (replace variables if you customized them):

```bash
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c '\dt'
```

Check Redis connectivity:

```bash
docker compose exec redis redis-cli ping
```


3. Update `.env` with your database credentials:

```bash
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=kopabridge
```

4. Start the stack:

```bash
docker compose up --build
```

5. Verify service availability:

- Customer portal: http://localhost/
- Swagger docs: http://localhost/docs
- Health: http://localhost/health

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

### Railway deployment

This repository is now Railway-ready using the API Docker image and the static portal served from `apps/api/public`.

1. Create a new Railway project.
2. Add a PostgreSQL plugin and a Redis plugin.
3. Create a Docker service using:
   - build context: `.`
   - dockerfile path: `apps/api/Dockerfile`
4. Set environment variables for the service:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL` from the PostgreSQL plugin
   - `REDIS_HOST` from the Redis plugin host
   - `REDIS_PORT` from the Redis plugin port
   - `JWT_SECRET` (random secret)
   - `TOKEN_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)
5. Deploy and visit the Railway service URL.

Because the portal is copied into the API image, no separate nginx or static web service is required. The app will serve the customer portal at `/`, the API at `/api/v1`, and docs at `/docs`.

### What this repository now does

- `docker-compose.override.yml` automatically runs `npx prisma migrate deploy` before the API starts.
- The API configuration loader now validates required production environment values before Nest boots.

### Important production notes

- `TOKEN_ENCRYPTION_KEY` must be a 64-character hexadecimal string.
- `JWT_SECRET` and `DATABASE_URL` are required in production.
- Do not commit real secret values; keep only `.env.example` under source control.
