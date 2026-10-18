# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json package-lock.json prisma.config.ts next.config.ts next-env.d.ts tsconfig.json auth.ts proxy.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY server ./server
COPY types ./types
COPY public ./public
RUN npm run prisma:generate && npm run build

# The CLI and maintenance job live in a separate, non-public image target.
# No seed source or application .env file is copied into this target.
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json prisma.config.ts tsconfig.json ./
COPY --chown=node:node prisma/schema.prisma ./prisma/schema.prisma
COPY --chown=node:node prisma/migrations ./prisma/migrations
COPY --chown=node:node scripts/cleanup-expired-records.ts ./scripts/cleanup-expired-records.ts
COPY --chown=node:node server/db/prisma.ts ./server/db/prisma.ts
COPY --chown=node:node server/services/maintenance/cleanup-expired-records.ts ./server/services/maintenance/cleanup-expired-records.ts
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(4000)}).then(response=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
