#!/bin/sh
set -euo pipefail

echo "=> Starting container entrypoint"

# Retry loop for running Prisma migrations until database is reachable and migrations succeed.
MAX_RETRIES=${MAX_RETRIES:-30}
SLEEP_SECONDS=${SLEEP_SECONDS:-2}
retries=0

echo "=> Running Prisma migrations (this will retry until success or max retries reached)"
until npx prisma migrate deploy; do
  retries=$((retries+1))
  echo "=> prisma migrate deploy failed (attempt ${retries}/${MAX_RETRIES}). Retrying in ${SLEEP_SECONDS}s..."
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "=> ERROR: migrations failed after ${retries} attempts"
    exit 1
  fi
  sleep ${SLEEP_SECONDS}
done

echo "=> Migrations applied successfully"

echo "=> Seeding demo data"
node prisma/seeds/seed.cjs

echo "=> Starting application"
exec node dist/src/main.js
