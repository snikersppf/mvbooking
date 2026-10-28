# Этап 10: заявки с контактами

Реализованы пункты 1–10 отдельными коммитами. Верификация email, договорные согласия, LegalDocument и ConsentRecord не добавлялись. .env не читался; зависимости не менялись. Исходные подготовленные изменения других файлов сохранены вне этих коммитов. Проверки выполнялись на текущем рабочем дереве, включая эти исходные изменения.

## Коммиты

| Пункт | Коммит | Изменение |
| --- | --- | --- |
| 1 | ea578d5 | Lead и PostgreSQL CHECK |
| 2 | 02f9eb6 | POST /api/leads, PostgreSQL limiter, outbox-заглушка |
| 3 | d5c8857 | Активные RU/EN формы |
| 4 | b5bc495 | Админка заявок, статусы, заметка, audit |
| 5 | 5f834de | Retention 12 месяцев и ADMIN-удаление |
| 6 | c562a0c | Публичный поток без аккаунта; staff-only вход |
| 7 | 19e3546 | CSP и защитные заголовки, HSTS |
| 8 | b438ec3 | Сессия и JWT maxAge 8 часов |
| 9 | aa81225 | TOTP, шифрование секрета, резервные коды |
| 10 | Этот коммит | Раздельные роли/URL и post-migration grants |

## Проверки

- `npm run lint`: успешно.
- `npm run typecheck`: успешно.
- `npm test`: 311 тестов, 55 файлов, успешно.
- `npm run build`: успешно; штатная команда в копии `/tmp` без `.env*`, вне sandbox-ограничений дочерних процессов, без изменения Next-конфига для сборки.
- Prisma generate/validate: успешно с временным конфигом без dotenv.
- UTF-8 без BOM, LF и финальный перевод строки: проверены изменённые текстовые файлы.

## Что не проверено

- PostgreSQL integration, применение миграций и реальная работа CHECK/каскадов/конкурентных операций.
- Создание ролей, смена владельцев, реальные GRANT/REVOKE, Docker build/start и production rollout. Подготовлены provisioning и integration tests; для ролевого теста нужны два явных URL одной provisioned *_test БД.
- Playwright, отправка через ingress, браузерные CSP/HSTS/шрифты и ручная проверка мобильной формы.
- Реальный аутентификатор, операторский CLI enrollment, часы сервера, восстановление и резервирование MFA-ключа.
- Внешняя доставка lead-уведомлений намеренно является заглушкой. SENT для LEAD_CREATED означает mock acknowledgement.
- Retention считается от updatedAt закрытой заявки; редактирование продлевает период. Истечение резервных копий настраивается отдельно.

Перед выпуском выполнить незакрытые проверки из [production-checklist.md](production-checklist.md). Для 2FA задать независимый MFA_ENCRYPTION_KEY и подключить каждый staff-аккаунт через защищённый терминал. Для БД выполнить операторскую настройку из [deployment-operations.md](deployment-operations.md#stage-10-database-role-update).

## Файлы

```text
Dockerfile
app/admin/leads/[id]/page.tsx
app/admin/leads/page.tsx
app/api/admin/leads/[id]/route.ts
app/api/leads/route.ts
app/login/page.tsx
auth.ts
components/auth/login-form.tsx
components/catalog/catalog-presentation.tsx
components/catalog/vehicle-detail.tsx
components/leads/lead-admin-form.tsx
components/leads/lead-form.tsx
components/site-header.tsx
components/ui/final-c-t-a.tsx
components/ui/footer.tsx
deploy/Caddyfile
deploy/grant-runtime-access.sql
deploy/provision-database-roles.sql
docker-compose.prod.yml
docs/deployment-operations.md
docs/production-checklist.md
docs/stage10-report.md
lib/admin-navigation.ts
lib/i18n/messages.ts
next.config.ts
playwright.config.ts
prisma.config.ts
prisma/migrations/20261028090000_lead/migration.sql
prisma/migrations/20261028091000_lead_notification/migration.sql
prisma/migrations/20261028092000_staff_totp/migration.sql
prisma/schema.prisma
proxy.ts
scripts/enroll-staff-totp.ts
scripts/grant-runtime-access.ts
scripts/validate-production-config.mjs
server/auth/callbacks.ts
server/auth/credentials.ts
server/auth/current-user.ts
server/auth/guards.ts
server/auth/session-identity.ts
server/db/prisma.ts
server/repositories/users.ts
server/security/lead-rate-limit.ts
server/security/totp.ts
server/services/leads/admin.ts
server/services/leads/create.ts
server/services/maintenance/cleanup-expired-records.ts
server/services/notifications/worker.ts
server/services/staff/totp.ts
server/validators/lead.ts
tests/auth/callbacks.test.ts
tests/auth/credentials.test.ts
tests/auth/current-user.test.ts
tests/auth/lazy-config.test.ts
tests/e2e/booking-flow.fixture.ts
tests/e2e/booking-flow.spec.ts
tests/integration/admin-api.integration.ts
tests/integration/admin-pages.integration.ts
tests/integration/cron-password-reset.integration.ts
tests/integration/database-roles.integration.ts
tests/integration/first-admin.integration.ts
tests/integration/leads.integration.ts
tests/integration/staff-totp.integration.ts
tests/integrations/password-reset-worker.test.ts
tests/leads/admin.test.ts
tests/leads/form.test.tsx
tests/leads/notification.test.ts
tests/leads/public.test.ts
tests/maintenance/cleanup-expired-records.test.ts
tests/security/database-config.test.ts
tests/security/first-admin.test.ts
tests/security/headers.test.ts
tests/security/production-startup.test.ts
tests/security/totp.test.ts
tests/site-header.test.tsx
types/next-auth.d.ts
```
