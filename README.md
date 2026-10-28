# MVBooking

MVP foundation for a car-rental booking platform in Georgia.

## Project documents

- [MVP specification](docs/mvp-spec.md)
- [Stage 1 architecture plan — approved with decisions and corrections](docs/architecture.md)
- [Project instructions](AGENTS.md)
- [Production checklist](docs/production-checklist.md)
- [Deployment, first ADMIN, scheduler, backup and restore](docs/deployment-operations.md)
- [Notification worker, Telegram, email and DNS](docs/notifications-operations.md)
- [Production vehicles, tariffs and image storage](docs/production-data.md)

The foundation page, Prisma schema, four applied SQL migrations and sample
seed exist. Stages 3–6 are implemented: registration and login, booking rules
and transactional services, catalog and availability, public/customer/admin
APIs, customer booking forms and account pages, and a temporary admin UI.
The booking workflow no longer plans online payment: a manager contacts the
customer and confirms the `PENDING` request manually. The existing Payment
table and payment-status fields remain as legacy schema until a separately
reviewed migration can remove them. Mock payment/map/SMS/WhatsApp adapters and
a browser E2E booking flow exist. Production notification delivery now uses
the existing outbox with a separate worker: Resend email to the customer and
Telegram to the manager. Telegram contains only the booking ID and admin link,
never customer personal data. Production password reset uses Resend.
Stage 9 includes Caddy HTTPS ingress, a safe first-admin command, scheduled
maintenance and encrypted offsite backup scripts. These are implemented
deployment mechanisms, not evidence of a working production installation.
The project is **NOT READY FOR PRODUCTION** until the live acceptance checks
and external setup in the production checklist are completed.

## Preview the current application

Requirements: Node.js 22.22.2 and npm.

Current pinned application stack: Next.js 16.4.3 (App Router), React 19.1.0,
TypeScript 5.9.3, PostgreSQL 16, Prisma client/CLI/adapter-pg 7.10.1,
Auth.js 5.0.0-beta.32, React Hook Form 7.89.0 and Zod 4.6.7.
Production-readiness review updated vulnerable dependency pins; it did not
change the database schema or booking architecture. Vitest remains on the 3.x
test-tool line; review remaining development-only advisories before CI exposure.

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

The `.env.example` template intentionally contains no values. Fill in
`DATABASE_URL` and the authentication/HTTP origin variables before starting:

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
is stored only as a hash, expires after one hour and can be used once.
Production requires `RESEND_API_KEY`, verified `EMAIL_FROM` and HTTPS
`APP_ORIGIN`; missing delivery configuration returns 503 for all accounts.
Production never logs reset links. See notification operations for delivery
failure behavior, timing protection and acceptance tests.

Next.js 16 Route Handlers do not expose the connection IP. In production,
IP-limited operations return 503 if a trusted ingress does not supply a valid
forwarded address. Do not enable `TRUST_PROXY_HEADERS` for direct public traffic.

Open http://localhost:3000. The home page itself does not query the database;
registration requires the local PostgreSQL setup below.
Stop the foreground dev server with Ctrl+C.
Using npm.cmd avoids PowerShell execution-policy restrictions on npm.ps1.

## Deployment

`Dockerfile` has separate `runner` (standalone Next.js, non-root),
`migrator` (Prisma CLI) and `operations` (worker/operator scripts) targets.
The production stack is
`docker-compose.prod.yml`; the existing `docker-compose.yml` remains for local
development. The production Compose project is named `mvbooking-prod`, so its
containers, network and database volume are separate from the local stack.
The build copies source files explicitly and `.dockerignore`
excludes `.env`, `.git`, and host `node_modules`, including nested copies.
The `deps`/`build` stages generate Prisma Client, compile the app and include
`types/` and `public/`; the runner serves both public assets and `.next/static`.
Auth.js validates `AUTH_SECRET` when handling requests, so the image builds
without database access, `.env`, or build-time secrets.
Supply secrets only at container runtime from a protected
environment file outside the repository. The production image contains no
seed script, and the migrator target also omits it. Do not run `prisma db seed`
in production.

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Runtime PostgreSQL URL (restricted runtime role); in production Compose its host is `postgres`, not `localhost`. URL-encode special password characters. |
| `MIGRATOR_DATABASE_URL` | Separate migration-role URL for the one-off migration service. |
| `MFA_ENCRYPTION_KEY` | Independent canonical base64 key containing 32 random bytes; identical for the app and staff enrollment command. Keep a protected recovery copy. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Production Compose PostgreSQL initialization; use unique non-placeholder credentials. Changing these does not update an existing database volume. |
| `AUTH_SECRET` | Private random value of at least 32 bytes for Auth.js. |
| `AUTH_URL` | Canonical public HTTPS application URL. |
| `APP_ORIGIN` | Exact public HTTPS origin for mutation checks; normally equals `AUTH_URL`. |
| `TRUST_PROXY_HEADERS` | `true` only behind an ingress that replaces client IP headers; otherwise `false`. |
| `CRON_SECRET` | Private random value of at least 32 bytes for `POST /api/cron/cancel-expired`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend sending key and a verified bare sender email address. Required for production reset and customer email. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_ID` | Private bot token and the authorized manager chat. Required by the notification worker only. |
| `VEHICLE_IMAGE_ORIGIN` | Owned permanent HTTPS image origin, used by the read-only production-data audit. |
| `E2E_DATABASE_URL` | Test runner only, mandatory `_test` database; never a production value. |
| `SEED_PASSWORD` | Local development seed only; never set or use for production. |
| `NODE_ENV`, `HOSTNAME`, `PORT` | Set by the Dockerfile to `production`, `0.0.0.0`, `3000` for the app. |
| `NEXT_TELEMETRY_DISABLED` | Set to `1` by the Dockerfile. |
| `NEXT_PHASE` | Internal Next.js build marker; never set in the production runtime. Setting the build phase manually would select the in-memory rate limiter. |

The checked-in `.env.example` is a blank variable inventory, not a ready-to-run
configuration. Create a protected production environment file outside this
repository with only the runtime and Compose variables above. Do not include
`SEED_PASSWORD`, `E2E_DATABASE_URL` or `NEXT_PHASE`. Payment, SMS, WhatsApp,
map and generic manager-webhook providers are not connected. Configure only
the Resend and Telegram providers documented above. Do not pass secrets as
Docker build arguments or save the output of `docker compose config` in logs.

Run these commands manually in order after reviewing the production checklist.
The migration job is an explicit one-off step; `up` does not run migrations or
seed automatically:

```bash
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml --profile ops build app migrate maintenance create-admin worker
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml up -d postgres
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml --profile ops run --rm migrate
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml up -d app worker proxy
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml ps
```

The `migrate` container runs `prisma migrate deploy`; it must finish
successfully before the app starts. `GET /api/health` is a no-secret liveness
probe for the app; PostgreSQL has a separate `pg_isready` healthcheck. Only
Caddy publishes ports (80/443); app and database have no host ports. Caddy
replaces incoming IP/protocol headers and Compose enables trusted proxy
headers only behind that boundary. The app startup validates matching public
HTTPS origins and strong secrets. A CDN in front needs a separate reviewed
trust configuration; do not enable it blindly.

The combined maintenance command authenticates to the existing expiration
endpoint on the private Compose network, then removes expired counters and
admin idempotency responses:

```bash
docker compose --env-file /path/to/mvbooking.production.env -f docker-compose.prod.yml --profile ops run --rm maintenance
```

The cleanup job removes counters with `resetAt` more than one hour in the past
and admin idempotency responses with `createdAt` more than 24 hours in the past.
Install the supplied systemd maintenance timer (every 15 minutes) and daily
backup timer using [deployment operations](docs/deployment-operations.md).
That guide contains first-ADMIN creation with a password passed over stdin,
login checks, encrypted `pg_dump` to offsite storage, retention and an isolated
restore drill. It lists the separate host dependencies and protected settings
in `deploy/operations.env.example`; no credentials are embedded in the image.

`npm run notifications:worker` runs the standalone worker; Compose restarts it
after failure. `npm run production:data:check` checks existing data without
changing it; provide `DATABASE_URL` and `VEHICLE_IMAGE_ORIGIN` through the
process environment. Do not use development seed for production data.
Alert on failed jobs and `Notification.FAILED`; merely running a worker is not
proof of delivery. See the [production checklist](docs/production-checklist.md)
for live acceptance gates and remaining blockers.

## Database setup

Use a single local `.env` file for Next.js, Prisma CLI and the seed.
`dotenv/config` loads `.env`. Existing shell environment variables take
precedence. Do not commit secrets. Fill `DATABASE_URL` for your local database
and `SEED_PASSWORD` before running the commands below;
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

### Browser E2E

The Playwright test covers registration, login, choosing a catalog vehicle,
checking its quote, creating a booking, viewing it in the account, manager
confirmation, and the customer seeing `CONFIRMED`. It seeds one temporary
manager and one available vehicle with tariffs; the customer is registered
through the UI. Test credentials are generated at runtime, and the test cleans
its uniquely prefixed users, vehicle, booking, outbox and audit records in a
`finally` block. No development seed or development database is used.

First install Chromium and prepare a separate database whose name ends in
`_test`. Use a distinct database for E2E if you also run integration tests in
parallel. Run migrations yourself before the browser test:

```bash
npx playwright install chromium
docker compose exec postgres createdb -U mvbooking -O mvbooking mvbooking_e2e_test
DATABASE_URL='postgresql://mvbooking:mvbooking_dev@localhost:5432/mvbooking_e2e_test?schema=public' npm run prisma:migrate:test
E2E_DATABASE_URL='postgresql://mvbooking:mvbooking_dev@localhost:5432/mvbooking_e2e_test?schema=public' npm run test:e2e
```

`E2E_DATABASE_URL` is mandatory. The Playwright config rejects any database
name without the `_test` suffix before starting Next.js or Prisma. It starts a
dedicated local server on `127.0.0.1:3107`, passes that URL as `DATABASE_URL`
to the server, and generates disposable Auth.js and cron secrets in memory.
Playwright does not load application `.env` files; Next.js may load them when
starting the app, but the explicit E2E database and auth variables take
precedence. The port must be free; `reuseExistingServer` is disabled to avoid
testing another instance.
Use `npm run test:e2e:list` to check discovery without opening a browser.
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
| `GET` | `/api/health` | Public | Minimal liveness, no database details or secrets |

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

## 2FA: первый ADMIN, сброс сотруднику и восстановление ключа

### Привязка аутентификатора первому ADMIN

1. Примените подготовленные миграции и создайте ACTIVE ADMIN по инструкции
   [First administrator](docs/deployment-operations.md#first-administrator).
   Создание ADMIN не включает 2FA: вход в админку до привязки запрещён.
2. Один раз создайте `MFA_ENCRYPTION_KEY`: `openssl rand -base64 32`.
   Сохраните результат в хранилище секретов и в защищённой резервной копии.
   Передайте **один и тот же** ключ приложению и команде привязки. Это общий ключ
   шифрования, отдельный от `AUTH_SECRET` и индивидуального секрета аутентификатора.
   Не генерируйте его заново при перезапуске. Тестовый ключ Playwright использовать
   в production нельзя.
3. Соберите operations-образ и запустите команду в интерактивном терминале
   доверенного оператора (замените путь и email; файл с переменными расположен
   вне репозитория):

   ```bash
   docker compose --env-file /protected/mvbooking.production.env -f docker-compose.prod.yml --profile ops build enroll-staff-totp
   docker compose --env-file /protected/mvbooking.production.env -f docker-compose.prod.yml --profile ops run --rm enroll-staff-totp admin@example.org
   ```

   Без Docker, с уже переданными через окружение `DATABASE_URL` и
   `MFA_ENCRYPTION_KEY`, команда из корня проекта:
   `./node_modules/.bin/tsx scripts/enroll-staff-totp.ts admin@example.org`.
   Скрипт не загружает `.env`. Привязка доступна только активному ADMIN/MANAGER
   без действующей 2FA; повторная команда существующую привязку не перезапишет.
4. Терминал покажет индивидуальный Base32-секрет и URI `otpauth://`.
   QR-картинки и страницы привязки сейчас нет. Добавьте запись вручную в
   аутентификатор: имя MVBooking, показанный секрет, TOTP, SHA-1, 6 цифр,
   период 30 секунд. Выполняйте команду без записи терминала и сбора его вывода
   в логи. Если приложение поддерживает импорт URI, можно использовать URI.
5. Введите текущий шестизначный код в запросе команды. После успешной проверки
   секрет сохранится зашифрованным, старые сессии будут отозваны и появится
   `STAFF_2FA_ENABLED` в AuditLog. Команда один раз покажет **10 резервных кодов**.
   Сохраните их офлайн; в БД сохраняются только хеши. Каждый код действует
   один раз, включая попытки параллельного входа.
6. Дождитесь следующего кода аутентификатора: код подтверждения уже использован.
   Откройте `/login`, введите email, пароль и новый код в поле второго фактора.
   Вместо TOTP можно ввести один резервный код в то же поле. Проверьте доступ
   к `/admin`. Отсутствие резервной копии кодов не исправляется повторным
   запуском команды: для новой привязки нужен сброс ниже.

### Сброс 2FA сотруднику

Отдельной страницы или команды сброса сейчас нет. После проверки личности
сотрудника доверенный оператор БД выполняет транзакцию ниже. Подключайтесь к
нужной БД через `psql` с защищёнными параметрами подключения; пароль не передавайте
в аргументах. `operator_id` — ID существующего ACTIVE ADMIN, ответственного за
сброс; `staff_email` — email сотрудника. Операция отзывает сессии, удаляет старый
секрет и все резервные коды, сохраняет аудит. Она не меняет пароль или роль.

```bash
psql -X -v operator_id='ADMIN_USER_ID' -v staff_email='staff@example.org'
```

В интерактивной сессии psql:

```sql
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('mvbooking:user-role-status'));
SELECT "id" FROM "User"
 WHERE "id" = :'operator_id' AND "role" = 'ADMIN' AND "status" = 'ACTIVE'
 FOR UPDATE;
WITH reset AS (
  UPDATE "User"
     SET "totpSecretEncrypted" = NULL, "totpEnabledAt" = NULL,
         "totpLastCounter" = -1, "backupCodeHashes" = ARRAY[]::text[],
         "sessionVersion" = "sessionVersion" + 1, "updatedAt" = now()
   WHERE "email" = lower(trim(:'staff_email'))
     AND "role" IN ('ADMIN', 'MANAGER') AND "status" = 'ACTIVE'
     AND EXISTS (SELECT 1 FROM "User" WHERE "id" = :'operator_id'
                 AND "role" = 'ADMIN' AND "status" = 'ACTIVE')
  RETURNING "id"
)
INSERT INTO "AuditLog" ("id", "userId", "action", "entity", "entityId", "metadata")
SELECT gen_random_uuid()::text, :'operator_id', 'STAFF_2FA_RESET', 'User', "id",
       '{"source":"operator-psql"}'::jsonb FROM reset
RETURNING "entityId";
```

Проверьте, что возвращён ровно один ожидаемый `entityId`, затем выполните
`COMMIT;`. При ошибке или неожиданном результате выполните `ROLLBACK;`.
Сотрудник не сможет войти до новой привязки. Повторите шаги 3–6 выше для его
email, передайте новые резервные коды и проверьте, что прежние больше не подходят.
Сброс первого ADMIN при потере аутентификатора выполняется тем же доверенным
оператором; существующая браузерная сессия для SQL-процедуры не нужна.

### Потеря MFA_ENCRYPTION_KEY

Сначала восстановите **точное прежнее значение** из хранилища секретов или
защищённой резервной копии, передайте его приложению и команде привязки и
перезапустите приложение. Восстановление только БД не восстанавливает ключ;
смена `AUTH_SECRET` не помогает. Для восстановления старой копии БД нужен
соответствующий ей ключ шифрования.

Если прежнее значение безвозвратно утрачено, расшифровать сохранённые TOTP-секреты
нельзя. Запланируйте окно обслуживания: создайте и сохраните новый ключ,
обновите его во всех экземплярах приложения и в окружении привязки, выполните
описанный аудируемый сброс для **каждого ADMIN/MANAGER**, включая первый ADMIN,
затем заново привяжите аутентификаторы и выдайте новые резервные коды. Активных
сотрудников восстановите перед открытием админки; для временно отключённых
аккаунтов повторите процедуру после их контролируемого включения. Старые
зашифрованные секреты с новым ключом не заработают. Резервные коды хешируются
отдельно и сами по себе не зависят от ключа, но не восстанавливают утраченный
TOTP-секрет; при сбросе они также аннулируются.
