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
# Provide dummy env vars for build (actual values are set at runtime via Dokku config)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV POSTGRES_URL_NON_POOLING="postgresql://dummy:dummy@localhost:5432/dummy"
ENV RESEND_API_KEY="re_dummy_key_for_build"
ENV EMAIL_FROM="noreply@example.com"
ENV IMAGEKIT_PRIVATE_KEY="dummy_private_key"
ENV IMAGEKIT_PUBLIC_KEY="dummy_public_key"
ENV NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/dummy"
ENV NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="dummy_secret_for_build"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
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
