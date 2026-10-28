# Production checklist

## Status: NOT READY FOR PRODUCTION

Repository implementation is not proof of deployed behavior. No production
domain, provider credentials, offsite storage or explicit test database was
available for this review. Docker, migrations and live sending were not run.
The gates below must have evidence before opening the site to customers.

## DONE — implemented and source-reviewed

- [x] Multi-stage standalone Next.js image, non-root runtime, Prisma generation,
  explicit separate `prisma migrate deploy` target, no seed in production images.
  `.dockerignore` excludes secret files, host modules and Git metadata.
- [x] Caddy HTTPS configuration; only ingress publishes ports. It replaces
  client-supplied IP/protocol headers; private app uses `TRUST_PROXY_HEADERS=true`.
  Startup checks matching public HTTPS `APP_ORIGIN` / `AUTH_URL` and strong secrets.
- [x] `create-admin`: existing password rules/scrypt, shared administration lock,
  atomic audit, safe repeated invocation, password over stdin, no promotion or
  password replacement of an existing account.
- [x] Existing outbox reused by a separate worker. Short locked claims, fenced
  completion, bounded retries, email idempotency; no HTTP inside booking/claim
  transactions. Telegram contains only booking ID and an authenticated admin link.
- [x] Resend customer email and reset email adapters; secrets only via runtime
  env. Reset token hashing, one-hour expiry, atomic single use, session revocation,
  bounded delivery retries and equal production response timing floor.
- [x] Authenticated expiration endpoint and combined scheduled cleanup of
  counters older than one hour / admin mutation responses older than 24 hours.
  Systemd timers for maintenance and daily backups are supplied.
- [x] Streaming encrypted `pg_dump`, offsite rclone copy/readback verification,
  bounded dedicated-prefix retention and isolated `_restore_test` restore script.
- [x] Existing admin data-entry flow documented; read-only production data audit
  checks real tariffs for 1–365 days and owned permanent HTTPS image locations.
  Image URL validation is shared by forms/API and rejects credentials,
  control characters and browser-normalized backslash URLs.
- [x] Lead source review plus cross-review by another worker. Public ownership,
  DB role/sessionVersion checks, same-origin mutations, parameterized SQL,
  cron authentication and fail-closed PostgreSQL rate limiting retained.
- [x] Ingress request bodies limited to 1 MB; raw third-party exception messages
  are redacted in production logs because they can embed query values or secrets.

These checkmarks mean code/configuration exists and was reviewed, not that DNS,
networking, provider delivery, real DB behavior or backups have been proven.
Final command results are recorded in the delivery report for this change.

### Local verification — 2026-10-26

- `npm run lint`, `npm run typecheck`, `npm test`: passed; **266 tests / 47 files**.
- `npm run build`: passed with Next.js 16.4.3 in an isolated source/dependency
  copy without `.env` or runtime secrets. This is not a Docker image build.
- Standalone `/api/health`, Compose YAML/static network checks, shell syntax
  and systemd calendar parsing were checked separately; no live HTTPS evidence.
- `npm audit --omit=dev`: **0 vulnerabilities** after targeted version updates.
  Full `npm audit`: **3 affected development packages (2 critical, 1 moderate)**
  remain: `vitest`, `tinypool`, `@vitest/mocker`. These are not traced into the
  standalone public runner; private build/operations images still include dev
  dependencies. No public Vitest/browser-mocker server is configured. Track a
  separately verified test-tool major upgrade; do not expose test servers or
  execute untrusted test code with production secrets. The full audit is NOT clean.
- Integration initially refused collection without explicit `_test` DATABASE_URL.
  No DB tests ran. The owner will run integration/E2E; new bootstrap tests also
  require permission to create/drop an isolated test schema. No migration was run.

Targeted updates: Next/eslint-config-next 16.4.3, Prisma CLI/client/adapter 7.10.1,
Zod 4.6.7, Vitest 3.2.7 and compatible transitive fixes for `sharp`, `fast-uri`,
`source-map-js`, `vite`. No `audit fix --force` or schema update was used.

## REQUIRED ENV

- [ ] Protected runtime environment outside the repository: `DATABASE_URL`,
  `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET`,
  `APP_ORIGIN`, `AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_MANAGER_CHAT_ID`. Generate independent Auth.js/cron secrets of at
  least 32 random bytes; replace development credentials and restrict file access.
- [ ] Same real HTTPS origin for `APP_ORIGIN` / `AUTH_URL`; no URL credentials,
  custom port, path, query or fragment. Keep `TRUST_PROXY_HEADERS=true` only in
  the supplied private-app/trusted-ingress deployment.
- [ ] Set `VEHICLE_IMAGE_ORIGIN` for the read-only production-data check.
- [ ] Configure host operations from `deploy/operations.env.example`: deployment
  paths, public age recipients file, private rclone config, dedicated offsite
  remote and retention. Keep the private age recovery identity off this server.
- [ ] Do not set `SEED_PASSWORD`, `E2E_DATABASE_URL` or `NEXT_PHASE` in runtime.
  No secrets in Docker build args, public `NEXT_PUBLIC_*`, logs or Git.

## REQUIRED DNS

- [ ] A record for the production host; AAAA only if IPv6 is working. Ports
  80/443 must reach Caddy for automatic certificates. Configure compatible CAA
  only after selecting the issuer. Verify renewal and HTTPS without `-k`.
- [ ] Verify the email domain in Resend and install the exact SPF/DKIM records
  displayed for that domain/region. Do not copy invented record values or add
  multiple SPF records. Configure DMARC with a real monitored report mailbox
  and an intentional rollout policy. Details: [email DNS](notifications-operations.md).
- [ ] Configure an owned stable image/CDN hostname and TLS if using a custom
  storage domain; no expiring signed links or third-party demonstration images.

## REQUIRED SERVER SETUP

- [ ] Follow [deployment operations](deployment-operations.md): Docker Compose,
  persistent volumes, restricted operator account, firewall, protected env files.
  Treat Docker-group access as host-equivalent privilege.
- [ ] PostgreSQL 16 with `btree_gist`; arrange extension and migration privileges
  on managed PostgreSQL. Prefer separate least-privilege runtime/migration roles.
  Apply `migrate deploy` explicitly before starting app/worker; never
  `migrate dev`, `reset`, `db push` or production seed.
- [ ] Check DB constraints including `booking_no_active_overlap` and
  `pricing_no_overlapping_tiers`; budget connections across app/worker/jobs.
- [ ] Bootstrap the first ADMIN, sign in through Auth.js and open protected
  admin pages. Confirm safe repeated bootstrap and no seeded users.
- [ ] Start app, worker and Caddy. Verify Secure/HttpOnly cookies, HTTP redirect,
  HTTPS and no direct public 3000/5432. Test spoofed forwarded headers from
  two external networks against the rate-limit counters.
- [ ] Install maintenance timer (every 15 minutes). Verify unauthenticated cron
  returns 401, authenticated execution cancels expired PENDING and cleans both
  operational tables. Alert after 30 minutes without a successful run.
- [ ] Install backup dependencies (`age`, `rclone`, Bash, `flock`) and daily
  02:30 UTC timer. Use a private backup directory, offsite copy, retention and
  provider versioning/object-lock policy. Alert after failed backup or >26h
  without a successful offsite archive. Agree the default up-to-24h RPO/RTO.
- [ ] Test restoration from offsite onto an isolated recovery host/database;
  record archive ID, row/constraint checks, application checks and duration.
  Disable external sending during recovery. Review account security rollback
  and rotate `AUTH_SECRET` when restoring older session/role state.
- [ ] Configure uptime/error tracking and alerts for failed units, worker restarts,
  `Notification.FAILED`, oldest PENDING age, rate-limit 429/503, certificate expiry,
  disk space and DB capacity. Never collect passwords, tokens, cookies or PII.
- [ ] Keep same-origin/JSON mutation protection and CORS unchanged. A CDN/load
  balancer before Caddy requires a reviewed two-hop IP trust configuration.

## EXTERNAL SERVICES

- [ ] Resend sending domain verified, real inbox delivery and reset link tested.
  Configure bounce/delivery monitoring and adequate account quotas.
- [ ] Telegram bot installed in the intended manager chat with send permission;
  protect its token, verify only booking ID/admin link is delivered.
- [ ] Owned object storage/CDN with restricted upload credentials, stable public
  read URLs, versioning/backup and correct content types; see
  [production data](production-data.md). No new public upload endpoint is added.
- [ ] Offsite backup storage in a separate host/account, restricted rclone access,
  recovery credentials independently accessible and restore verified.
- [ ] Payment/refund/webhook integrations remain disabled. Legacy Payment schema
  and mock interfaces are not live payment support. SMS/WhatsApp/map are also
  mocks; do not present them as connected services.

## MANUAL STEPS / ACCEPTANCE EVIDENCE

- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` on the
  exact release. Run integration and Playwright with explicitly supplied,
  migrated `_test` database URLs; never point tests at dev/production.
- [ ] Build/run Docker images and confirm healthchecks, signal shutdown/restart,
  migration exit status and no secrets in image layers/build logs.
- [ ] Run create-admin → login → admin; customer booking → DB/outbox → worker →
  Telegram and customer email; manager confirmation → customer notification.
  Include overlapping/adjacent dates, request retries and permissions.
- [ ] Run forgot password → real inbox → reset → login with new password;
  old password, old sessions and reused/expired token must fail. Normal production
  reset acknowledgement deliberately waits at least 16 seconds to hide provider
  latency. Verify frontend/proxy timeouts accommodate this.
- [ ] Verify failed delivery alerts and manual review. Telegram has no provider
  idempotency: uncertain sends/expired leases must not be blindly replayed.
- [ ] Enter actual owned vehicles, prices, deposits and images through the admin
  UI. Run `production:data:check`, inspect pages and all image links manually.
  Audit is read-only and does not invent business data or test link reachability.
- [ ] Record successful cron/cleanup execution and offsite backup/restore drill.
- [ ] Run `npm audit --omit=dev` and full `npm audit` at each release. Review
  reachable advisories, including Prisma CLI transitive dependencies; never
  blindly run `npm audit fix --force`. Historical
  [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m)
  affected older `@hono/node-server` pins; assess the actual lockfile, not the
  historical label. CLI tools stay outside the public runner.

## BLOCKERS — not verified by this repository-only change

1. No configured/verified production domain, HTTPS certificate, real-client-IP
   boundary or deployed ADMIN login.
2. No real Resend/Telegram credentials, verified sending DNS or demonstrated
   booking/reset delivery. SMTP is not a fallback; mock delivery is not success.
3. No running production timer/worker monitoring or verified cleanup run.
4. No configured offsite backup destination, successful automatic archive or
   documented restore drill. A local Docker volume is not a backup.
5. No owner-approved production cars/prices/image inventory or storage evidence.
6. No explicit test DB available in this session, so new DB integration tests
   and end-to-end acceptance remain unexecuted. Docker build/runtime is also
   unverified. Static review/unit tests cannot replace these checks.
7. Remaining development-tool critical advisories require tracked remediation
   or a documented deployment/CI risk decision; they are not evidence of an
   exploitable public application path, and must not be silently dismissed.

Do not relabel the project production-ready until every applicable gate above
has an owner and recorded passing evidence. Delivery retries are bounded, not
a guarantee of eventual delivery during an extended provider outage.

## Changed files in this delivery

```text
.dockerignore
.env.example
AGENTS.md
Dockerfile
README.md
docker-compose.prod.yml
package.json
package-lock.json
deploy/Caddyfile
deploy/backup.sh
deploy/operations.env.example
deploy/restore-test.sh
deploy/systemd/mvbooking-backup.service
deploy/systemd/mvbooking-backup.timer
deploy/systemd/mvbooking-maintenance.service
deploy/systemd/mvbooking-maintenance.timer
docs/deployment-operations.md
docs/notifications-operations.md
docs/production-data.md
docs/production-checklist.md
components/admin/form-schemas.ts
lib/vehicle-image-url.ts
scripts/check-production-data.ts
scripts/create-admin.ts
scripts/notification-worker.ts
scripts/run-scheduled-maintenance.ts
scripts/validate-production-config.mjs
server/http/route-handler-errors.ts
server/integrations/notification.ts
server/integrations/notification-production.ts
server/services/admin/create-first-admin.ts
server/services/maintenance/production-data.ts
server/services/notifications/worker.ts
server/services/users/password-reset.ts
server/validators/admin.ts
tests/admin/image-url.test.ts
tests/auth/password-reset.test.ts
tests/http/route-handler-errors.test.ts
tests/integration/cron-password-reset.integration.ts
tests/integration/first-admin.integration.ts
tests/integration/notification-worker.integration.ts
tests/integrations/notification-production.test.ts
tests/maintenance/production-data.test.ts
tests/security/first-admin.test.ts
tests/security/production-startup.test.ts
```

## Stage 10.1 — contact enquiry model

- [x] Lead stores contacts, optional vehicle/dates, lifecycle, manager note and server-recorded contact-consent version/time.
- [x] PostgreSQL CHECK rejects missing/blank email and phone; dates cannot be reversed. No account or contract-document models are required.
- [x] Existing lint, typecheck and unit suite checked for this change; Prisma client regenerated without dotenv.
- [ ] Apply migrations on a disposable *_test DB and run `tests/integration/leads.integration.ts`. No database credentials were loaded in this session.
- [ ] Production migration/backup and browser acceptance remain operator checks.

## Stage 10.2 — public lead endpoint

- [x] Strict input, required contact-processing consent, server-selected version/time; generic 202 acceptance for genuine and honeypot submissions, no contact lookup or account disclosure.
- [x] Exact Origin/JSON checks and mandatory shared PostgreSQL IP limiter (5/hour); production requires trusted ingress IP headers. Store failure fails closed.
- [x] Atomic Lead + Notification nested write. LEAD_CREATED worker is explicitly a stub: SENT records mock acknowledgement, not real delivery. No contacts enter notification payload/logs.
- [x] Lint, typecheck, unit and build checked in a copy excluding .env files.
- [ ] Apply outbox migration and verify the endpoint/concurrent limits with PostgreSQL and a deployed ingress. Real lead delivery is not implemented.

## Stage 10.3 — public enquiry forms

- [x] FinalCTA and vehicle details use the same active form: name, email/phone, dates, comment, unchecked required contact-processing consent and hidden honeypot.
- [x] RU/EN copy, validation, success, throttling and network failure states. Selected vehicle is passed to the endpoint; dates use Georgia UTC+04.
- [x] Form render/i18n tests, lint, typecheck, unit and build checked.
- [ ] Browser submission against migrated PostgreSQL, mobile layout and live ingress limits remain unverified; no external messages are sent by the stub.

## Stage 10.4 — staff lead management

- [x] MANAGER/ADMIN lead list with bounded pagination/status filter, detail card, status/note changes and navigation entry.
- [x] Read services re-read DB-backed session identity. Writes re-lock/check actor role, status and sessionVersion; Lead and minimal AuditLog metadata commit together, without contacts/notes in audit metadata.
- [x] Mutation endpoint checks Origin, JSON and staff rate limit. Unit tests cover denied reads, locked-role changes and audit writes; lint/typecheck/unit/build checked.
- [ ] Real PostgreSQL concurrency, browser staff workflow and role changes during requests still require integration acceptance.

## Stage 10.5 — lead retention and deletion

- [x] Both maintenance commands use the shared cleanup: CLOSED leads with updatedAt strictly older than 12 calendar months (UTC) are deleted; open/recent leads remain. Editing/reopening resets the inactivity period; leap day clamps to February 28.
- [x] Notification rows cascade on lead deletion; audit retains only entity ID/action, without contacts or notes. Backups need a separately enforced expiry policy.
- [x] ADMIN-only, Origin-protected manual delete with confirmation and atomic minimal audit. Manager deletion is denied in the locked DB check.
- [x] Calendar cutoff/closed-only cleanup and deletion authorization tests, lint/typecheck/unit/build checked.
- [ ] Production maintenance schedule, real cascade behavior, backup expiry and data-owner acceptance require deployment verification.
