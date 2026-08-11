# ==============================================================================
# STAGE 1: BUILDER
# ==============================================================================
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache libc6-compat

# Copy root start.sh and API-specific files
COPY start.sh ./
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/
COPY apps/api/tsconfig*.json ./
COPY apps/api/nest-cli.json ./
COPY apps/api/docker-entrypoint.sh ./

RUN npm ci

COPY apps/api/src ./src
COPY apps/api/public/. ./public
COPY apps/web/. ./public

# Generate client directly into node_modules
RUN npx prisma generate

# Build the application NestJS assets
RUN npm run build

# Prune devDependencies
RUN npm prune --production && npm cache clean --force

# ==============================================================================
# STAGE 2: PRODUCTION RUNTIME
# ==============================================================================
FROM node:24-alpine AS production

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Install Alpine runtime dependencies for Prisma engine
RUN apk add --no-cache libc6-compat openssl

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/docker-entrypoint.sh ./
COPY --from=builder /usr/src/app/start.sh ./

RUN chmod +x ./docker-entrypoint.sh ./start.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/usr/src/app/docker-entrypoint.sh"]