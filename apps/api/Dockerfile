# ==============================================================================
# STAGE 1: BUILDER
# ==============================================================================
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate client directly into node_modules
RUN npx prisma generate

# Build the application NestJS assets
RUN npm run build

# Prune devDependencies (keeps the generated engine artifacts inside node_modules/.prisma)
RUN npm prune --production && npm cache clean --force

# ==============================================================================
# STAGE 2: PRODUCTION RUNTIME
# ==============================================================================
FROM node:24-alpine AS production

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/src/main.js"]