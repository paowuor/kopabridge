# ==============================================================================
# STAGE 1: BUILDER
# ==============================================================================
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Install system dependencies needed for native modules or specific tooling
RUN apk add --no-cache libc6-compat

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies) to allow compilation
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Generate Prisma Client binary bindings
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate

# Compile TypeScript source down to production-optimized JavaScript binaries
RUN npm run build

# Prune development dependencies so only production packages remain
RUN npm prune --production && npm cache clean --force

# ==============================================================================
# STAGE 2: PRODUCTION RUNTIME
# ==============================================================================
FROM node:24-alpine AS production

# Set safe execution node environmental flags
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy production node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the compiled application JavaScript artifacts
COPY --from=builder /usr/src/app/dist ./dist

# Copy the generated Prisma engine artifacts and schema for migrations
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package*.json ./

# Expose the API engine internal port
EXPOSE 3000

# Execute the application layer via compiled main entry point
CMD ["node", "dist/apps/api/main.js"]