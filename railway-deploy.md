# Railway Deployment

This repository can deploy to Railway using a single Docker service for the API and frontend.

## Service configuration

- Build context: `.`
- Dockerfile path: `apps/api/Dockerfile`
- Start command: `./start.sh`
- Port: `3000`

## Required Railway plugins

- PostgreSQL
- Redis

## Required environment variables

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` (from PostgreSQL plugin)
- `REDIS_HOST` (from Redis plugin)
- `REDIS_PORT` (from Redis plugin)
- `JWT_SECRET` (secure random string)
- `TOKEN_ENCRYPTION_KEY` (64 hex chars, e.g. `openssl rand -hex 32`)

## Notes

- The static portal files from `apps/web` are copied into `apps/api/public` during the Docker build.
- The API serves the portal from `public`, so the app uses one Railway service instead of a separate static host.
- The `/api/v1` API path and `/docs` docs path are served from the same origin.
