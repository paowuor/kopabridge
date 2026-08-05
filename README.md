# kopabridge

# 🌉 KopaBridge

[![CI Status](https://github.com/paowuor/kopabridge/actions/workflows/ci.yml/badge.svg)](https://github.com/paowuor/kopabridge/actions/workflows)
[![Node Version](https://img.shields.io/badge/node-v24.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An enterprise-grade financial middleware and data verification layer connecting decentralized infrastructure to real-world alternative utility telemetry data streams.

Unified Energy API infrastructure for alternative credit scoring from PAYGo solar and IoT energy systems.

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

If you see a 404 at `/`, remember the API is mounted under `/api/v1` and docs are at `/docs`. The repository now redirects root `/` to `/docs` via the included `nginx` config.

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
curl -i http://localhost/docs
curl -i http://localhost/health
curl -i http://localhost/api/v1/health
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

- API: http://localhost/
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

### What this repository now does

- `docker-compose.override.yml` automatically runs `npx prisma migrate deploy` before the API starts.
- The API configuration loader now validates required production environment values before Nest boots.

### Important production notes

- `TOKEN_ENCRYPTION_KEY` must be a 64-character hexadecimal string.
- `JWT_SECRET` and `DATABASE_URL` are required in production.
- Do not commit real secret values; keep only `.env.example` under source control.
