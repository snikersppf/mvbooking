# MVBooking

MVP foundation for a car-rental booking platform in Georgia.

## Project documents

- [MVP specification](docs/mvp-spec.md)
- [Stage 1 architecture plan — approved with decisions and corrections](docs/architecture.md)
- [Project instructions](AGENTS.md)

The foundation page, Prisma schema, two SQL migrations and sample seed exist.
Authentication, application API and booking services have not been implemented.

## Preview the current application

Requirements: Node.js 22.22.2 and npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. The current page contains the MVBooking heading
and foundation message. It does not require a database.
Stop the foreground dev server with Ctrl+C.
Using npm.cmd avoids PowerShell execution-policy restrictions on npm.ps1.

## Database setup

Use a single local `.env` file for Next.js, Prisma CLI and the seed.
`dotenv/config` loads `.env`. Existing shell environment variables take
precedence. Do not commit secrets. Edit `SEED_PASSWORD` before seeding;
the same password is used for all three local example users.

```powershell
cd F:\code\mvbooking
npm.cmd ci
Copy-Item .env.example .env
docker compose up -d
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

Run these commands yourself in an environment with Docker Desktop.
The assistant has not run Docker, migrations or seed.
The seed is restricted to NODE_ENV other than production and the local
`mvbooking` database on localhost/127.0.0.1. It creates 12 vehicles,
four pricing tiers per vehicle, three users with scrypt password hashes
and two sample bookings relative to the time of the first seed.
Fixed IDs and upsert leave existing records, booking dates and statuses
unchanged on subsequent runs.

Migration order: `20261004100000_init` creates schema and indexes;
`20261004101000_constraints` installs btree_gist, CHECK constraints
and GiST exclusions for Booking and PricingRule. Do not use `prisma db push`
in place of these migrations.

After applying migrations, inspect the constraints:

```powershell
docker compose exec postgres psql -U mvbooking -d mvbooking -c "SELECT conname, contype FROM pg_constraint WHERE conname IN ('booking_no_active_overlap', 'pricing_no_overlapping_tiers') ORDER BY conname"
```

Prisma configuration: [Prisma 7 config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
Runtime adapters: [Prisma 7 drivers](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers).

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The current smoke test only proves the test runner starts.
Database integration tests and booking/auth E2E tests are still planned.
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
