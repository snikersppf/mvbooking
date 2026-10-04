# MVBooking

MVP foundation for a car-rental booking platform in Georgia.

## Project documents

- [MVP specification](docs/mvp-spec.md)
- [Stage 1 architecture plan — awaiting approval](docs/architecture.md)
- [Project instructions](AGENTS.md)

Only the foundation page, Prisma schema and sample seed currently exist.
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

## Database setup — after architecture approval

Use a single local `.env` file for Next.js, Prisma CLI and the seed.
The existing `import "dotenv/config"` loads `.env`, not `.env.local`.
Existing shell environment variables take precedence. Do not commit secrets.

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Before migrations and seed can work, Stage 2 must fix the Prisma 7 runtime:
install the PostgreSQL driver adapter, pass it to PrismaClient, explicitly load
the seed environment, and add reviewed SQL migrations and constraints.
The current seed uses `new PrismaClient()` without an adapter and fails
before querying PostgreSQL.

After those fixes and PostgreSQL availability:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

The schema is in `prisma/schema.prisma`; the migration directory is not yet
created. The seed defines 12 vehicles, four tiers per vehicle, and three test
users without password hashes. It must be restricted to a disposable local
development database before introducing real users or vehicles.

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
The project currently has no Git repository, so attributes take effect when
the project is placed under Git. Do not initialize Git or commit files implicitly.

## Design replacement

Keep domain services, repositories, validators and API contracts independent
of visual components. After receiving the design, replace temporary page
layouts, CSS tokens, form presentation and placeholder assets; keep database
constraints, money/date rules and authorization intact.
