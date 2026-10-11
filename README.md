# MVBooking

MVP foundation for a car-rental booking platform in Georgia.

## Project documents

- [MVP specification](docs/mvp-spec.md)
- [Stage 1 architecture plan — approved with decisions and corrections](docs/architecture.md)
- [Project instructions](AGENTS.md)

The foundation page, Prisma schema, three SQL migrations and sample seed exist.
Stage 3 authentication, registration and temporary auth pages are implemented.
Stage 4a booking rules and validators and Stage 4b database-backed booking
services are implemented. Booking Route Handlers and catalog UI are still
planned.

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

## Text files

Use UTF-8 without BOM and LF according to `.editorconfig`.
`.gitattributes` normalizes Git line endings; it does not itself validate UTF-8.
The project is under Git; inspect `git status --short` before committing.

## Design replacement

Keep domain services, repositories, validators and API contracts independent
of visual components. After receiving the design, replace temporary page
layouts, CSS tokens, form presentation and placeholder assets; keep database
constraints, money/date rules and authorization intact.
