# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl

# Enable corepack and pre-bake the exact Yarn version so it is never
# downloaded again at build time (avoids the per-stage corepack download).
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY prisma ./prisma

# Mount the Yarn global cache so packages are only fetched once across builds.
# BuildKit persists this cache on the host between deploys.
RUN --mount=type=cache,target=/root/.yarn \
    YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_LDA_SHORT_NAME="LDA"
ARG NEXT_PUBLIC_LDA_SHORT_NAME_PLURAL="LDAs"
ARG NEXT_PUBLIC_LDA_FULL_NAME="Local Development Agency"
ARG NEXT_PUBLIC_LDA_FULL_NAME_PLURAL="Local Development Agencies"
ARG NEXT_PUBLIC_LDA_URL_PATH="ldas"
ARG NEXT_PUBLIC_LOGO_PATH="/images/logo.webp"
ARG NEXT_PUBLIC_FAVICON_PATH="/images/favicon/favicon.ico"
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=""
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_ENVIRONMENT=""
ARG NEXT_PUBLIC_ENABLE_COUNTRY_REGION="false"
ARG SENTRY_AUTH_TOKEN=""

ENV NODE_OPTIONS="--max-old-space-size=1280"

RUN --mount=type=cache,target=/app/.next/cache \
    yarn build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
