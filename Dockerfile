FROM node:20-alpine AS base

# Install dependencies needed for native modules (bcrypt)
RUN apk add --no-cache libc6-compat openssl

# Enable corepack for Yarn 4
RUN corepack enable

FROM base AS deps
WORKDIR /app

# Copy package files and prisma schema (needed for postinstall)
COPY package.json yarn.lock .yarnrc.yml ./
COPY prisma ./prisma

# Install dependencies (includes prisma generate via postinstall)
RUN yarn install

FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN yarn prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1

# Build args for NEXT_PUBLIC vars (baked into the app at build time)
# LDA naming
ARG NEXT_PUBLIC_LDA_SHORT_NAME="LDA"
ARG NEXT_PUBLIC_LDA_SHORT_NAME_PLURAL="LDAs"
ARG NEXT_PUBLIC_LDA_FULL_NAME="Local Development Agency"
ARG NEXT_PUBLIC_LDA_FULL_NAME_PLURAL="Local Development Agencies"
ARG NEXT_PUBLIC_LDA_URL_PATH="ldas"
# Branding
ARG NEXT_PUBLIC_LOGO_PATH="/images/logo.webp"
ARG NEXT_PUBLIC_FAVICON_PATH="/images/favicon/favicon.ico"
# ImageKit
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=""
# API Base URL
ARG NEXT_PUBLIC_API_BASE_URL=""

ENV NEXT_PUBLIC_LDA_SHORT_NAME=$NEXT_PUBLIC_LDA_SHORT_NAME
ENV NEXT_PUBLIC_LDA_SHORT_NAME_PLURAL=$NEXT_PUBLIC_LDA_SHORT_NAME_PLURAL
ENV NEXT_PUBLIC_LDA_FULL_NAME=$NEXT_PUBLIC_LDA_FULL_NAME
ENV NEXT_PUBLIC_LDA_FULL_NAME_PLURAL=$NEXT_PUBLIC_LDA_FULL_NAME_PLURAL
ENV NEXT_PUBLIC_LDA_URL_PATH=$NEXT_PUBLIC_LDA_URL_PATH
ENV NEXT_PUBLIC_LOGO_PATH=$NEXT_PUBLIC_LOGO_PATH
ENV NEXT_PUBLIC_FAVICON_PATH=$NEXT_PUBLIC_FAVICON_PATH
ENV NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN yarn build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
