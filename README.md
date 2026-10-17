# MVBooking

MVP foundation for a car-rental booking platform in Georgia.

## Project documents

- [MVP specification](docs/mvp-spec.md)
- [Stage 1 architecture plan — approved with decisions and corrections](docs/architecture.md)
- [Project instructions](AGENTS.md)

The foundation page, Prisma schema, three applied SQL migrations and sample
seed exist. Stages 3–6 are implemented: registration and login, booking rules
and transactional services, catalog and availability, public/customer/admin
APIs, customer booking forms and account pages, and a temporary admin UI.
The admin UI is currently in the working tree and has not yet been committed.
The booking workflow no longer plans online payment: a manager contacts the
customer and confirms the `PENDING` request manually. The existing Payment
table and payment-status fields remain as legacy schema until a separately
reviewed migration can remove them. Stage 7 is in progress; browser E2E and CI
(Stage 8) and production deployment (Stage 9) remain. Booking notifications
still use an outbox record with a mock provider; no sender is running.

## Preview the current application

Requirements: Node.js 22.22.2 and npm.

### Linux (Arch Linux)

```bash
npm ci
cp .env.example .env
chmod 600 .env
npm run dev
```

### Windows (PowerShell)

```powershell
npm.cmd ci
npm.cmd run dev
```

Before starting, configure the authentication and HTTP origin variables:

- `AUTH_SECRET` — a private random value of at least 32 bytes. Never commit it.
- `AUTH_URL` — the canonical Auth.js URL, including the scheme and port when
  applicable, for example `http://localhost:3000`.
- `APP_ORIGIN` — the exact public application origin used to validate
  state-changing requests, for example `http://localhost:3000`. It normally
  matches `AUTH_URL` and must not contain a path, query or credentials.
- `TRUST_PROXY_HEADERS` — `false` unless the application runs behind a trusted
  reverse proxy that replaces `X-Forwarded-For`/`X-Real-IP`; set it to `true`
  only in that controlled deployment.
- `CRON_SECRET` — a private random value of at least 32 bytes for the
  expired-booking maintenance endpoint. Do not expose it to browsers.

`PENDING` bookings older than 24 hours are cancelled by
`POST /api/cron/cancel-expired` when called with
`Authorization: Bearer <CRON_SECRET>`. Schedule this POST at least hourly;
it is not run automatically by the web server. The job rechecks status under
row locks, writes an audit record and releases the reserved interval.

Password reset pages are `/forgot-password` and `/reset-password?token=...`.
In development, a reset link is printed to the server console for an existing
active account; the HTTP response is the same for unknown accounts. The token
is stored only as a hash, expires after one hour and can be used once. Mock
delivery is deliberately unavailable in production until a real private
delivery channel is configured; request attempts return 503 there.

Next.js 16 Route Handlers do not expose the connection IP. In production,
IP-limited operations return 503 if a trusted ingress does not supply a valid
forwarded address. Do not enable `TRUST_PROXY_HEADERS` for direct public traffic.

Open http://localhost:3000. The home page itself does not query the database;
registration requires the local PostgreSQL setup below.
Stop the foreground dev server with Ctrl+C.
Using npm.cmd avoids PowerShell execution-policy restrictions on npm.ps1.

## Database setup

Use a single local `.env` file for Next.js, Prisma CLI and the seed.
`dotenv/config` loads `.env`. Existing shell environment variables take
precedence. Do not commit secrets. Edit `SEED_PASSWORD` before seeding;
the same password is used for all three local example users. The seed rejects
the documented placeholder and passwords shorter than 12 characters.

On Linux:

```bash
npm ci
cp .env.example .env
chmod 600 .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

On Windows PowerShell:

```powershell
cd F:\code\mvbooking
npm.cmd ci
Copy-Item .env.example .env
docker compose up -d
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

The initial migrations and seed have been verified by the project owner with
PostgreSQL 16 on Arch Linux. Re-run them after database-related changes.
The seed is restricted to NODE_ENV other than production and the `mvbooking`
database on localhost, 127.0.0.1 or the Compose service host `postgres`. It creates 12 vehicles,
four pricing tiers per vehicle, three users with scrypt password hashes
and five sample bookings (one per booking status). The CANCELLED example
overlaps the PENDING booking for the same vehicle to demonstrate that only
active statuses reserve availability.
Fixed IDs and upsert leave existing records, booking dates and statuses
unchanged on subsequent runs.

Migration order: `20261004100000_init` creates schema and indexes;
`20261004101000_constraints` installs btree_gist, CHECK constraints and GiST
exclusions for Booking and PricingRule; `20261009090000_user_email_lowercase`
enforces canonical lowercase user email addresses. Do not use `prisma db push`
in place of these migrations.

The Prisma schema also declares `RateLimitCounter` and
`AdminMutationResult` for production rate limiting and admin idempotency.
The migration `20261014020322_add_rate_limit_and_idempotency` creates these
tables. Deploy it before using production rate limiting or admin mutations;
do not use `prisma db push` on an existing database.

Production checklist: schedule `npm run maintenance:cleanup` at least hourly
with the production `DATABASE_URL` provided by the job environment. It deletes
rate-limit counters whose window ended more than one hour ago and stored admin
mutation responses older than 24 hours. The job needs the full npm dependencies
because the script uses `tsx`; do not run it against a database before its
migrations have been deployed. These responses contain whitelisted admin DTOs,
not password hashes or tokens, but can contain user contact details and comments.

After applying migrations, inspect the constraints:

```bash
docker compose exec postgres psql -U mvbooking -d mvbooking -c "SELECT conname, contype FROM pg_constraint WHERE conname IN ('booking_no_active_overlap', 'pricing_no_overlapping_tiers', 'user_email_lowercase') ORDER BY conname"
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U mvbooking -d mvbooking < prisma/verify-constraints.sql
```

Prisma configuration: [Prisma 7 config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
Runtime adapters: [Prisma 7 drivers](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The smoke test proves the test runner starts; password unit tests cover valid
and invalid passwords and per-hash random salts. Booking integration tests use
only an explicit `DATABASE_URL` whose database name ends in `_test`; the test
Prisma config does not load application `.env` files.

Create and prepare the separate local test database, then run the integration
suite:

```bash
docker compose exec postgres createdb -U mvbooking -O mvbooking mvbooking_test
DATABASE_URL='postgresql://mvbooking:mvbooking_dev@localhost:5432/mvbooking_test?schema=public' npm run prisma:migrate:test
DATABASE_URL='postgresql://mvbooking:mvbooking_dev@localhost:5432/mvbooking_test?schema=public' npm run test:integration
```

Booking/auth E2E tests are still planned.
If a check cannot run due to environment permissions or missing PostgreSQL,
report it as unverified rather than passed.

## HTTP API

Successful responses use `{ "data": ... }`. Errors use
`{ "error": { "code", "messageKey", "fieldErrors"?, "requestId" } }`.
Private responses set `Cache-Control: private, no-store`. Public availability
and quotes are not stored; catalog responses use a short shared cache.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/vehicles` | Public | Filtered, sorted and paginated catalog |
| `GET` | `/api/vehicles/[slug]` | Public | Vehicle, images and pricing tiers |
| `GET` | `/api/vehicles/[slug]/availability` | Public | Availability for an offset-aware period |
| `GET` | `/api/vehicles/[slug]/quote` | Public | Availability and non-reserving quote |
| `GET` | `/api/availability` | Public | Available vehicles for a period |
| `POST` | `/api/bookings` | Active session | Create a booking for the current user |
| `GET` | `/api/bookings` | Active session | List only the current user's bookings |
| `GET` | `/api/bookings/[id]` | Active session, owner | Read an own booking; another user's ID returns `404` |
| `PATCH` | `/api/bookings/[id]/cancel` | Active session, owner | Cancel an own unpaid `PENDING` booking |
| `GET` | `/api/me` | Active session | Current DB-verified user profile |

Catalog filters are `category`, `minPrice`, `maxPrice`, `seats`,
`transmission`, `fuel`, `drive`, `sort`, `page` and `pageSize` (maximum 50).
Availability endpoints require `startDate` and `endDate` with an explicit UTC
offset or `Z`. `/api/availability` accepts the catalog filters too.

Public reads are limited to 120 requests per minute per resolved client IP.
Booking creation is limited to 10 attempts per minute per user. `POST` and
`PATCH` require `Content-Type: application/json` and an exact `Origin` matching
`APP_ORIGIN`. `POST /api/bookings` accepts an optional `Idempotency-Key` header
(1–128 characters); replaying the same body returns the existing booking.
Admin mutations also accept this optional header. A repeat by the same actor
with the same method, path and JSON body returns the saved successful data;
reusing the key for a different request returns 409. Authorization and rate
limits still apply to every attempt.

Catalog example:

```bash
curl 'http://localhost:3000/api/vehicles?category=SUV&sort=price_asc&page=1&pageSize=12'
```

Booking example (replace the cookie and identifiers with local values):

```bash
curl -X POST 'http://localhost:3000/api/bookings' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'Idempotency-Key: booking-2026-10-11-001' \
  -H 'Cookie: authjs.session-token=REPLACE_ME' \
  --data '{
    "vehicleId": "REPLACE_ME",
    "startDate": "2026-11-01T10:00:00+04:00",
    "endDate": "2026-11-04T10:00:00+04:00",
    "pickupLocation": "Tbilisi Airport",
    "returnLocation": "Tbilisi Airport",
    "customerComment": "Flight arrives at 09:20"
  }'
```

Example conflict response:

```json
{
  "error": {
    "code": "VEHICLE_UNAVAILABLE",
    "messageKey": "errors.vehicleUnavailable",
    "requestId": "0d93f506-c8a4-4e95-930a-6750a44d8452"
  }
}
```

## Text files

Use UTF-8 without BOM and LF according to `.editorconfig`.
`.gitattributes` normalizes Git line endings; it does not itself validate UTF-8.
The project is under Git; inspect `git status --short` before committing.

## Design replacement

Keep domain services, repositories, validators and API contracts independent
of visual components. After receiving the design, replace temporary page
layouts, CSS tokens, form presentation and placeholder assets; keep database
constraints, money/date rules and authorization intact.
