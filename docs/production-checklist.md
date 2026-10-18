# Production checklist

Use this checklist before exposing MVBooking to real customers. The Compose
files and standalone build are deployment scaffolding, not proof of production
readiness. See [README](../README.md#production-containers) for explicit
build, migration and start commands. Do not run the local development seed or
`prisma migrate dev`, `prisma db push`, or a reset against production.

## Secrets and network boundary

- [ ] Put `DATABASE_URL`, `POSTGRES_PASSWORD`, `AUTH_SECRET` and `CRON_SECRET`
  in a restricted production secret store or an environment file outside the
  repository. Generate independent random Auth.js and cron secrets of at least
  32 bytes; do not reuse development values or pass secrets via build args.
  Restrict read access, rotate on exposure, and review container/log output for
  accidental disclosure.
- [ ] Set `AUTH_URL` and `APP_ORIGIN` to the same canonical public HTTPS
  origin. Terminate TLS at a trusted ingress. The Compose application binds
  only to `127.0.0.1:3000`; PostgreSQL exposes no host port.
- [ ] Set `TRUST_PROXY_HEADERS=true` only if the ingress removes client-supplied
  `X-Forwarded-For` and `X-Real-IP` and writes a verified client address.
  Otherwise leave it `false`; production IP-limited operations fail closed
  when no reliable address is available. Block direct access that bypasses the
  ingress.
- [ ] Keep database credentials scoped to the app and one-off jobs. If using
  a managed pooler, use the supported runtime URL for the app and a direct
  database connection for `prisma migrate deploy` when the provider requires
  it. Budget connection pools across all app replicas and monitor
  `pg_stat_activity` to avoid exhausting PostgreSQL connections.

## Database and release

- [ ] Use PostgreSQL 16 with durable storage. On managed PostgreSQL, confirm
  that `btree_gist` is available and that the migration role can run
  `CREATE EXTENSION IF NOT EXISTS btree_gist` before applying the exclusion
  constraints. Verify `booking_no_active_overlap` and
  `pricing_no_overlapping_tiers` after migration.
- [ ] Take an encrypted backup or managed snapshot before each schema release;
  configure recurring backups and retention, and test a full restore to an
  isolated database. Monitor disk and backup failures. Never treat the Compose
  volume as a backup.
- [ ] Build the exact release, then run the one-off `migrate` service and check
  exit status before starting or replacing the app. Do not make migrations an
  implicit app startup command. Pin and review tested Node/Postgres image
  digests during release promotion.
- [ ] Do not run seed in production. Neither production image target includes
  `prisma/seed.ts`, and the seed code itself rejects `NODE_ENV=production`.
  Create initial staff accounts through a reviewed operational procedure,
  not the example seed users.
- [ ] Check `GET /api/health` (app liveness) and the PostgreSQL container's
  healthcheck after deployment. Liveness does not prove database readiness;
  also run a guarded smoke flow against the deployed database before traffic.

## Scheduled jobs and integrations

- [ ] Set a strong, private `CRON_SECRET`. Call
  `POST /api/cron/cancel-expired` at least hourly with
  `Authorization: Bearer <CRON_SECRET>` over HTTPS. Restrict the scheduler's
  access and never put the token in a URL or logs. This cancels `PENDING`
  bookings older than 24 hours and frees availability.
- [ ] Run the Compose `maintenance` one-off service at least hourly from a
  trusted scheduler. It deletes expired `RateLimitCounter` rows and old
  `AdminMutationResult` responses; those responses may contain customer
  contact details and comments. Alert on job failures.
- [ ] Confirm production uses the PostgreSQL-backed atomic rate-limit store,
  not process memory. Deploy the `RateLimitCounter` migration before traffic,
  monitor 429/503 rates, and keep the cleanup job running. A database failure
  must not silently disable limits.
- [ ] Manager notifications currently remain mock outbox records. Do not
  enable a manager webhook until a sender, retry policy and destination
  authentication are reviewed. Its payload must contain only booking ID and
  an admin link—no name, contacts, dates, price or other personal data.
- [ ] Online payment is disabled. Do not expose payment/refund handlers or
  payment webhooks merely because legacy Payment columns or mock interfaces
  exist. If payments are introduced later, require provider signatures,
  replay/idempotency protection, reconciliation, and verified refund flows.
  Replace development-only password-reset link logging with private delivery
  before offering password reset in production.

## Dependency and operational review

- [ ] Run `npm audit --omit=dev` for the runtime dependency set and
  `npm audit` for the full build/migration toolchain on every release; review
  findings by installed version and reachable surface. Do not run
  `npm audit fix --force` blindly, since it may change Prisma major versions.
- [ ] Track the historical Prisma CLI transitive advisory
  [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m)
  for `@hono/node-server` below 1.19.13. Prisma's
  [issue #29605](https://github.com/prisma/orm/issues/29605) records the
  affected older `@prisma/dev` pins and subsequent fix. The current lock has
  `@prisma/dev@0.24.17` and no `@hono/node-server` entry; recheck the actual
  dependency tree and audit output after every lockfile update. Keep CLI tools
  in the one-off migrator image, not the public app runtime.
- [ ] Review application logs, audit logs, database alerts, cron results and
  backup restoration regularly. Re-run lint, typecheck, unit, integration,
  E2E and a container smoke test for each release candidate.
