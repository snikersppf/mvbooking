# MVBooking: план Этапа 1

Дата проверки: 2026-10-04. Статус: **на утверждение**.
Документ описывает будущую реализацию, а не уже работающие функции.
До утверждения меняются только документация, пути и правила хранения текстовых файлов.

## 1. Результат проверки проекта

Есть Next.js App Router, стартовая страница, Prisma schema и seed.
Нет авторизации, Route Handlers приложения, booking service и миграций.
Seed содержит 12 автомобилей и 3 пользователя без паролей.
В проекте нет Git-репозитория.

Файлы `AGENTS.md` и `docsmvp-spec.md` успешно декодируются строгим UTF-8;
русский текст сохранён корректно. Предыдущее заключение о повреждённой
кириллице было ошибкой отображения PowerShell. Проверены 20 исходных текстовых
файлов, включая lockfile; некорректных UTF-8 последовательностей и
характерных признаков mojibake не обнаружено.

Нужны нормализация LF/завершающего перевода строки, перенос спецификации
в `docs/mvp-spec.md` и восстановление Markdown: блок кода оплаты не закрыт,
часть следующих разделов попала внутрь него.

Обнаружены технические блокеры будущего Этапа 2:

- README предлагает `.env.local`, но `import "dotenv/config"` читает `.env`.
- Seed вызывает `new PrismaClient()`; локальная проверка конструктора
  завершается `PrismaClientInitializationError`: Prisma 7 требует adapter.
- PostgreSQL-адаптер в зависимостях отсутствует.
- Auth.js не установлен. Zod установлен транзитивно, но не объявлен зависимостью приложения.
- Индекс доступности не запрещает пересекающиеся бронирования.
- Nullable `maxDays` в составном UNIQUE позволяет несколько открытых диапазонов.
- Тест `expect(true).toBe(true)` проверяет только запуск раннера.
- Seed при повторном запуске меняет роли пользователей и переводит машины в AVAILABLE.
  До использования реальных данных добавить отказ при production и явное разрешение
  запускать seed только на локальной тестовой базе.
- Статусы оплаты в Booking и Payment должны обновляться согласованно;
  клиент не может назначать PAID.

Эти изменения бизнес-кода здесь только запланированы.

## 2. Точные версии и официальные источники

Версии проверены в package.json, package-lock.json и установленных пакетах.

| Компонент | Фактическая версия | Решение до реализации |
| --- | --- | --- |
| Next.js | 16.3.5 | Сохранить |
| React / React DOM | 19.1.0 / 19.1.0 | Сохранить; peerDependencies Next допускают эти версии |
| Prisma CLI / Client | 7.10.0 / 7.10.0 | Сохранить; PostgreSQL adapter той же версии |
| Auth.js, пакет next-auth | Не установлен | Предлагается точно 5.0.0-beta.32; это pre-release |
| @auth/core | Не установлен | Определяется зависимостью next-auth; закрепляется lockfile |
| Zod | 4.6.5, транзитивно | Добавить прямую зависимость zod@4.6.5 |
| Vitest | 3.2.4 | Сохранить; пользоваться руководством v3 |
| TypeScript | 5.9.3 | Сохранить |
| Node.js | 22.22.2 в окружении | Node 22 для локального запуска/CI |
| PostgreSQL | Образ postgres:16-alpine | Мажорная версия 16; фактический patch сервера пока не проверен |

Никакие зависимости сейчас не устанавливаются и не обновляются.
Наличие пакета в транзитивном дереве не заменяет прямую зависимость приложения.
Существующая сборка проходила, но совместимость будущей авторизации должна
быть подтверждена после установки тестами регистрации/входа.

### Next.js 16: proxy.ts и серверные проверки

В корне рядом с `app/` использовать `proxy.ts` и экспорт `proxy`.
В Next.js 16 middleware переименован; Proxy работает в Node.js runtime.
Proxy нужен для предварительного перенаправления на login.
Окончательное решение о доступе принимают guards в Route Handlers,
Server Actions и server services. Отключение Proxy не должно открывать API.

`params`, `cookies()` и `headers()` использовать асинхронно согласно Next 16.
Авторизованные данные не помещать в общий persistent cache.
Для API аккаунта/броней — `Cache-Control: private, no-store`.

Источники: [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16),
[Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy),
[Data security](https://nextjs.org/docs/app/guides/data-security).
Версионные руководства также есть локально в `node_modules/next/dist/docs/`.

### Prisma 7: CLI и runtime — отдельные подключения

Для CLI URL находится в `prisma.config.ts`, схема — в `prisma/schema.prisma`.
Принять единый `.env`: это соответствует текущему `dotenv/config`.
В Next.js переменные доступны серверу; в seed их нужно явно загрузить.
Значения окружения хостинга имеют приоритет, секретов в репозитории нет.

На следующем этапе добавить `@prisma/adapter-pg@7.10.0` и PostgreSQL driver.
Runtime создаёт `PrismaPg({ connectionString: DATABASE_URL })`,
передаёт его в `new PrismaClient({ adapter })`.
Сохранить существующий `prisma-client-js` и импорт `@prisma/client`
для минимального изменения; смену generator не смешивать с настройкой БД.

Один экземпляр клиента на процесс, повторное использование при dev HMR;
не создавать pool на каждый запрос. Размер pool ограничить с учётом числа
инстансов. В production при pooler разделить runtime URL и прямое подключение
CLI, если того требует выбранный PostgreSQL-хостинг.

Источники: [Prisma 7 config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference),
[Driver adapters](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers).

### Auth.js Credentials: предложенная версия и механизм

Выбрана v5 API, конкретный выпущенный pre-release:
[next-auth@5.0.0-beta.32](https://github.com/nextauthjs/next-auth/releases/tag/next-auth@5.0.0-beta.32).
Этот выбор входит в утверждаемый план; пакет ещё не установлен.
Не смешивать примеры v4 (`getServerSession`) с v5 (`auth()`).

`auth.ts` возвращает `handlers, auth, signIn, signOut`.
В `app/api/auth/[...nextauth]/route.ts` экспортируются GET и POST из handlers.
Credentials импортируется из `next-auth/providers/credentials`.
В `authorize(credentials, request)`: Zod-валидация, rate limiting,
поиск User, проверка ACTIVE и хеша пароля; результат — безопасные поля User
либо null с единым сообщением об ошибке.

Обязательно `session.strategy = "jwt"`.
Credentials сам не регистрирует пользователей и требует JWT-сессии.
Регистрацию и сохранение User делает наш серверный сервис.
PrismaAdapter для Credentials MVP не подключать: текущая схема не содержит
Account/Session/VerificationToken и Credentials не требует этих таблиц.
Если появится OAuth, проектировать Account и адаптер отдельным изменением.

Источники: [Installation](https://authjs.dev/getting-started/installation),
[Credentials API](https://authjs.dev/reference/core/providers/credentials),
[Credentials guide](https://authjs.dev/getting-started/providers/credentials).
Zod: [официальное руководство v4](https://zod.dev/).
Vitest: [официальное руководство v3](https://v3.vitest.dev/guide/).

## 3. Границы и структура

```text
app/                      страницы и тонкие Route Handlers
components/               временные формы/таблицы; позже дизайн
auth.ts                   Auth.js v5 конфигурация
proxy.ts                  предварительные redirect-проверки
server/auth/              currentUser и guards
server/db/                Prisma client, PostgreSQL adapter
server/services/          booking, pricing, users, vehicle services
server/repositories/      запросы и блокировки БД
server/validators/        Zod-схемы входных данных
server/integrations/      payment, maps, notifications adapters
server/security/          CSRF, rate limiting, password hashing
lib/                      чистые общие утилиты
types/                    DTO и расширение Auth.js типов
prisma/                   schema, migrations, local-only seed
tests/                    unit и PostgreSQL integration
e2e/                      Playwright
docs/                     spec, architecture, будущий OpenAPI
```

Маршруты преобразуют HTTP в DTO; services обеспечивают инварианты;
repositories работают с transaction client. Модули БД, auth и секреты —
только server-side. Ни JSX, ни дизайн-токены не должны проникать в services.
Для переводов RU/EN/KA использовать ключи сообщений и codes ошибок,
не строить бизнес-логику на тексте интерфейса.

## 4. Prisma-модели, типы, индексы и удаления

Ниже точные поля существующей схемы и предлагаемые изменения.
`String` без native-type — PostgreSQL text; `Int` — integer;
`Json` — jsonb; `Decimal(12,2)` — numeric(12,2).
`?` означает NULL. Идентификаторы — String PK с cuid.
Все timestamps — DateTime @db.Timestamptz(3).
createdAt = now(), updatedAt = @updatedAt, где поле предусмотрено.
Каждый индекс — B-tree, кроме указанных GiST.

### Enum

- UserRole: CUSTOMER, MANAGER, ADMIN.
- UserStatus: ACTIVE, INACTIVE, SUSPENDED.
- VehicleStatus: AVAILABLE, UNAVAILABLE, MAINTENANCE, ARCHIVED.
- BookingStatus: PENDING, CONFIRMED, CANCELLED, COMPLETED, REJECTED.
- PaymentStatus: UNPAID, PENDING, PAID, FAILED, REFUNDED.
- NotificationChannel: EMAIL, SMS, TELEGRAM, WHATSAPP.
- NotificationType: BOOKING_CREATED, BOOKING_UPDATED, BOOKING_CANCELLED,
  BOOKING_CONFIRMED, BOOKING_REJECTED.
- NotificationStatus: PENDING, SENT, FAILED.
- Предложение: PaymentPurpose = RENTAL, DEPOSIT для разделения залога и аренды.
- Категории/трансмиссия/топливо/привод пока String с whitelist Zod;
  enum этих полей можно добавить после согласования каталога.

### User

Поля: id String PK; name String; email String UNIQUE; phone String?;
passwordHash String?; role UserRole = CUSTOMER; status UserStatus = ACTIVE;
createdAt/updatedAt DateTime. Relations: bookings[], notifications[], auditLogs[].

Предложение: sessionVersion Int = 0. Меняется при смене пароля,
блокировке и смене роли, чтобы аннулировать старые JWT на сервере.
Email нормализовать одинаково при регистрации и входе (trim + lowercase);
уникальный индекс — последняя защита от конкурентных регистраций.
passwordHash nullable только для будущих внешних провайдеров/seed;
Credentials не допускает вход с NULL.

Индексы: UNIQUE(email), (role,status), (status).
Для нормализованного email дополнительных дублирующих индексов не нужно.
Удаление: физическое удаление запрещают связанные Booking/Notification/AuditLog
через Restrict; в MVP менять status и сохранять историю.

### Vehicle

Поля: id String PK; slug String UNIQUE; brand/model String; year Int;
category String; description String? @db.Text; seats Int;
transmission/fuel/drive String; engine String?;
depositAmount Decimal(12,2); insuranceIncluded Boolean = false;
status VehicleStatus = AVAILABLE; location String;
createdAt/updatedAt DateTime. Relations: images[], pricingRules[], bookings[].

Предложение: currency String @db.VarChar(3) = GEL для явной валюты депозита.
Для MVP только GEL, тарифы автомобиля должны иметь ту же валюту.

Индексы: UNIQUE(slug), (status,category), (status,location), (status,seats).
Удаление: images/pricingRules Cascade; Booking.vehicleId Restrict.
Публичная операция удаления машины фактически архивирует её,
с проверкой отсутствия будущих активных броней.

### VehicleImage

Поля: id String PK; vehicleId String FK; url String; alt String?;
sortOrder Int = 0. Индекс: (vehicleId,sortOrder).
FK vehicleId -> Vehicle.id, onDelete Cascade.
Для перестановки порядка не делать лишний UNIQUE(sortOrder).

### PricingRule

Поля: id String PK; vehicleId String FK; minDays Int; maxDays Int?;
pricePerDay Decimal(12,2); currency String @db.VarChar(3) = GEL.
FK -> Vehicle, onDelete Cascade.

Текущие индексы: UNIQUE(vehicleId,minDays,maxDays) и такой же обычный индекс.
Предложение: заменить оба на UNIQUE(vehicleId,minDays).
Это запрещает повторное начало диапазона, включая maxDays = NULL,
и позволяет поиск тарифов по vehicleId без дублирующего индекса.
Сам UNIQUE не запрещает пересекающиеся диапазоны: добавить ручной
GiST exclusion по vehicleId и int8range(minDays,maxDays,'[]').
NULL maxDays — открытая верхняя граница. CHECK minDays >= 1,
maxDays IS NULL OR maxDays >= minDays, pricePerDay > 0.
Сервис изменения тарифов отдельно проверяет отсутствие пробелов и
ровно один открытый последний диапазон.

### Booking

Поля: id String PK; userId/vehicleId String FK;
startDate/endDate DateTime; pickupLocation/returnLocation String;
totalDays Int; pricePerDay/totalAmount/depositAmount Decimal(12,2);
currency String @db.VarChar(3) = GEL;
status BookingStatus = PENDING; paymentStatus PaymentStatus = UNPAID;
customerComment/managerComment String? @db.Text;
createdAt/updatedAt DateTime. Relations: payments[], notifications[].

Предложение: idempotencyKey String, requestHash String,
UNIQUE(userId,idempotencyKey) для повторной отправки создания брони.
Перед начальной миграцией эти поля required; при существующих данных
потребовалась бы отдельная backfill-миграция.

Индексы: существующие (vehicleId,status,startDate,endDate),
(userId,createdAt), (status,startDate,endDate).
Добавить exclusion GiST из раздела 7.
FK userId -> User Restrict; vehicleId -> Vehicle Restrict.
CHECK startDate < endDate, totalDays >= 1, pricePerDay > 0,
totalAmount >= 0, depositAmount >= 0, currency = GEL.
Физическое удаление бронирований не входит в API.

### Payment

Поля: id String PK; bookingId String FK; provider String;
providerPaymentId String?; amount Decimal(12,2);
currency String @db.VarChar(3) = GEL; status PaymentStatus = PENDING;
metadata Json?; createdAt/updatedAt DateTime.

Предложение: purpose PaymentPurpose = RENTAL;
idempotencyKey String UNIQUE для вызова провайдера.
UNIQUE(provider,providerPaymentId) сохраняется; несколько NULL до ответа
провайдера допустимы. Индекс (bookingId,status).
FK -> Booking Restrict. CHECK amount > 0.
UNPAID используют в Booking; новую попытку Payment создавать PENDING.
В MVP полная оплата и полный возврат каждого платежа, без частичных возвратов.
Booking.paymentStatus отражает аренду; залог имеет отдельный Payment DEPOSIT.

### Notification

Поля: id String PK; userId String FK; bookingId String? FK;
channel NotificationChannel; type NotificationType;
status NotificationStatus = PENDING; payload Json?;
sentAt DateTime?; errorMessage String? @db.Text; createdAt DateTime.

Предложение: eventKey String UNIQUE, attempts Int = 0,
nextAttemptAt DateTime = now(), lockedUntil DateTime?, updatedAt DateTime.
eventKey включает событие, получателя и канал.
Индексы: (userId,status), (bookingId,status), (status,createdAt);
для worker — (status,nextAttemptAt).
User onDelete Restrict; Booking onDelete SetNull.
Это outbox: запись в транзакции бронирования; отправка отдельным worker,
с lease и ограниченными повторами. Доставка at-least-once;
дедупликация при поддержке провайдером, без обещания exactly-once.

### AuditLog

Поля: id String PK; userId String FK; action String;
entity String; entityId String; metadata Json?; createdAt DateTime.
Индексы: (userId,createdAt), (entity,entityId,createdAt).
User onDelete Restrict.
Append-only через приложение; хранить актёра, переход статуса и requestId.
Не сохранять пароли, reset tokens, cookies и полные данные карт.

### Дополнительные модели для заявленных функций

PasswordResetToken: id String PK, userId String FK, tokenHash String UNIQUE,
expiresAt DateTime, consumedAt DateTime?, createdAt DateTime.
Индексы (userId,expiresAt), (expiresAt). User onDelete Cascade.
Случайный токен хранить только в виде хеша, TTL 30 минут,
одноразовое потребление в транзакции вместе с passwordHash/sessionVersion.
Добавить на этапе авторизации/восстановления.

PaymentWebhookEvent: id String PK, provider String, providerEventId String,
paymentId String? FK, payloadHash String, processedAt DateTime?,
createdAt DateTime. UNIQUE(provider,providerEventId), index(paymentId).
Payment onDelete SetNull. Добавить при подключении реальных webhook.
Сначала проверить подпись и найти Payment; событие и обновление оплаты
сохранять атомарно. Не считать запись необработанного события успешной обработкой.

Примечание: список proposed полей требует обновления schema только после утверждения.
OAuth-модели Account/Session/VerificationToken не нужны Credentials MVP.

## 5. Деньги

Принять Decimal(12,2) в БД и Prisma.Decimal в расчётах.
API передаёт суммы десятичными строками, например "180.00".
Не использовать float/JS number для денежной арифметики и не доверять
итоговой цене от клиента. Decimal создавать из строки.
Поддерживается только GEL с двумя десятичными знаками.
Это проектное ограничение MVP.

pricePerDay округляется до 2 знаков HALF_UP при записи/расчёте тарифного правила.
totalAmount = округлённый pricePerDay × totalDays — стоимость аренды.
depositAmount сохраняется отдельно как возвращаемый залог;
totalDue = totalAmount + depositAmount — явное вычисляемое поле DTO.
Залог не является выручкой и не добавляется повторно в totalAmount.

Booking содержит снимок тарифа, валюты и залога. Изменение Vehicle/PricingRule
не меняет уже созданные бронирования.
Платёжный адаптер конвертирует GEL в minor units строго и однократно
("180.00" -> 18000), проверяет точность и лимит провайдера.
При новой валюте её exponent и округление проектировать отдельно.

Существующий seed использует number × multiplier; заменить Decimal-расчётом
в Этапе 2, одновременно с исправлением adapter.

Источник типа: [Prisma Decimal](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types).
Правила цены/залога выше — предлагаемые бизнес-решения для утверждения.

## 6. Даты и длительность

Хранить моменты времени в timestamptz(3); серверные Date и ответы API — UTC,
ISO 8601 с Z. PostgreSQL сохраняет момент и не сохраняет исходное имя timezone.
Единый часовой пояс пунктов выдачи/возврата — Asia/Tbilisi.

API принимает дату-время с явным offset/Z. Локальный datetime формы
преобразуется через Asia/Tbilisi; запрещено интерпретировать его в timezone
компьютера туриста или сервера. Даты без времени и offset на API не принимать.
Пример: 2026-10-10T10:00:00+04:00 = 2026-10-10T06:00:00Z.
Имя Asia/Tbilisi использовать в преобразованиях/отображении, без hardcoded +04.

Предложение MVP: сутки = каждые начатые 24 часа,
totalDays = ceil((endUTC-startUTC)/86400000), минимум 1.
start < end; начало не в прошлом; срок ограничить 365 сутками.
Для 24 часов — 1 день; 24 часа + 1 минута — 2.
Календарные ночи и льготный период в эту формулу не входят.

Период занятости — [start,end): следующая аренда может начаться
точно в момент возврата предыдущей. На MVP дополнительного буфера нет;
если нужен интервал мойки/подготовки, утвердить отдельно и изменить
и проверку доступности, и SQL-диапазон одновременно.

Источник хранения:
[PostgreSQL date/time](https://www.postgresql.org/docs/16/datatype-datetime.html).
Правила округления срока и буфера — проектные решения, требующие утверждения.

## 7. Защита от двойного бронирования

### Решение по статусам

PENDING и CONFIRMED занимают автомобиль.
CANCELLED, REJECTED, COMPLETED не блокируют новую аренду.
На MVP PENDING держит период до решения менеджера, без автоматического TTL;
это сознательное ограничение, требующее утверждения.
Не делать availability-запрос обещанием резервации: право закрепляется при commit.

Переходы:
PENDING -> CONFIRMED / REJECTED / CANCELLED.
CONFIRMED -> COMPLETED после endDate, либо CANCELLED менеджером.
Терминальные статусы не открывать снова через обычный PATCH.
Клиент отменяет только собственный неоплаченный PENDING;
оплаченные/подтверждённые отмены обрабатывает менеджер по правилам возврата.

### Ручная SQL-миграция

После начальной Prisma migration создать отдельную reviewed SQL migration.
Ниже фрагмент будущего migration.sql, сейчас он не применён:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_valid_period"
  CHECK ("startDate" < "endDate");

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_active_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startDate", "endDate", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));
```

GiST constraint создаёт собственный индекс. btree_gist даёт оператор =
для text vehicleId; && проверяет пересечение tstzrange.
Не добавлять столбец Unsupported range: индекс строится на выражении.

Это защищает INSERT и UPDATE, включая перевод брони в активный статус.
Предварительный SELECT без ограничения недостаточен при гонке.
При существующих пересечениях миграция должна остановиться, а не удалять данные.
На hosting заранее проверить возможность установки btree_gist;
расширение должно быть доступно и в shadow database.

Порядок миграций: initial tables -> custom constraints -> local seed.
Команда create-only создаёт черновик; SQL просмотреть и применить отдельно.
После фиксации миграцию не редактировать задним числом.
Production: migrate deploy, без migrate dev/reset/db push.
db push не заменяет migration history с ручными ограничениями.

Источники: [PostgreSQL ranges](https://www.postgresql.org/docs/16/rangetypes.html),
[btree_gist](https://www.postgresql.org/docs/16/btree-gist.html),
[custom Prisma migrations](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features).

### Транзакция и блокировки

Booking service использует короткую interactive transaction с ReadCommitted.
Первым делом блокируется User создателя (FOR UPDATE) и проверяются
ACTIVE/sessionVersion; затем Vehicle (FOR UPDATE).
После блокировки машины заново читаются status, тарифы и занятость.
Операции изменения статуса машины и тарифов берут ту же Vehicle-блокировку.
Рабочий порядок блокировок фиксирован: User -> Vehicle -> Booking;
для нескольких записей — сортировка id. Смена роли/статуса пользователя
берёт User-блокировку, чтобы не пройти конкурентно со старой авторизацией.

Для бронирования рассчитываются суммы, проверяется idempotency key,
создаются Booking, AuditLog и Notification; затем commit.
Для повтора с тем же key/hash возвращать существующую бронь,
даже если её период теперь занят этой самой бронью.
Тот же key с другим payload — 409; конкурирующие повторы решаются
UNIQUE(userId,idempotencyKey), при конфликте повторно читается результат.

Для смены статуса прочитать/заблокировать Booking в том же порядке,
проверить current status и ожидаемую версию; не делать безусловный update.
Exclusion constraint остаётся последней защитой независимо от блокировок.
ReadCommitted + одинаковые row locks + SQL constraint выбраны вместо
обязательного Serializable; будущая смена isolation требует отдельного теста.

Параметризованные Prisma raw queries для row locks, никаких SQL-конкатенаций.
Сетевые запросы к оплате/уведомлениям не выполнять внутри транзакции.
Оповещения уходят через outbox после commit.

SQLSTATE 23P01 + имя booking_no_active_overlap -> HTTP 409 VEHICLE_UNAVAILABLE.
Не считать любую Prisma ошибку конфликтом занятости: формат wrapping
adapter-pg и SQLSTATE проверить integration-тестом конкретной версии.
P2034/40001/40P01 — ограниченный retry всей транзакции (до 3 попыток с jitter);
исчерпание retry — 503 с повторяемым requestId.
Не retry бизнес-конфликты бесконечно.

Источники: [Prisma transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions),
[PostgreSQL error codes](https://www.postgresql.org/docs/16/errcodes-appendix.html).

### Тест, доказывающий защиту

На настоящем PostgreSQL выполнить два параллельных создания одного автомобиля
с пересекающимися датами: один успех и один 409, в БД одна активная бронь.
Отдельно проверить два INSERT напрямую, минуя services, чтобы доказать constraint.
Дополнительно: соседние интервалы допустимы; другие машины допустимы;
отмена освобождает период; UPDATE в активный статус ловит пересечение;
пересечения не зависят от timezone клиента.
Unit mock БД этот набор не заменяет.

## 8. Сессия, актуальная роль и статус

В authorize брать id, role, status и sessionVersion из User.
jwt callback при входе сохраняет sub/id, role и sessionVersion.
session callback выставляет session.user.id и session.user.role.
Типы Session/User/JWT расширить module augmentation.
Пароль/хеш и технические токены в session не передавать.

В session callback можно подгрузить актуальную роль для UI.
Это не отменяет requireCurrentUser в каждой защищённой операции:
auth() -> валидный session.user.id -> SELECT User ->
status ACTIVE -> совпадение sessionVersion -> проверка разрешённых ролей.
Не доверять session.role, body.role, body.userId и client session.update().
Регистрация всегда CUSTOMER; смена роли — отдельный ADMIN endpoint.
User отсутствует, заблокирован или JWT устарел — доступ закрыт.
При недоступной БД — 503, без fallback на роль из JWT.

Повторное чтение можно дедуплицировать внутри одного запроса,
но не кэшировать User между запросами.
Для мутаций повторить проверку в транзакции под блокировкой User.
ADMIN не может лишить систему последнего ACTIVE ADMIN:
сериализовать все изменения ролей/статусов одним advisory lock,
после блокировки заново проверять количество администраторов.
Проверку последнего ADMIN одной count вне транзакции не считать достаточной.

Хеширование: Node crypto.scrypt, случайная соль, параметры хранить в hash string;
constant-time comparison, параметры подобрать на хостинге.
Пароли не обрезать молча; лимиты валидировать до дорогого хеширования.
Reset увеличивает sessionVersion; старые JWT перестают работать на сервере.
Физическое logout очищает cookie текущего браузера; revoke всех сессий —
увеличение sessionVersion.

Источники: [Auth.js RBAC](https://authjs.dev/guides/role-based-access-control),
[Node 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html).
Проверки БД и sessionVersion — наш проектный слой, не автоматическая функция Auth.js.

## 9. API и права доступа

Все роли ниже предполагают действующую сессию и ACTIVE в БД.
У посетителя без сессии доступны только публичные операции.
Клиент видит только свою бронь, платежи и аккаунт.
ManagerComment и платёжная metadata отсутствуют в customer/public DTO.

| Метод и путь | Доступ | Назначение |
| --- | --- | --- |
| GET /api/vehicles | Public | Опубликованные машины, фильтры, сортировка, пагинация |
| GET /api/vehicles/:slug | Public | Без внутренних комментариев/служебных статусов |
| GET /api/vehicles/:slug/availability | Public | Доступность по датам |
| GET /api/availability | Public | Список доступных машин; лимиты диапазона |
| GET /api/vehicles/:slug/quote | Public | Предварительная цена, без резервирования |
| GET, POST /api/auth/[...nextauth] | Auth.js | Вход, выход, session, CSRF и callback |
| POST /api/auth/register | Public | Всегда CUSTOMER |
| POST /api/auth/forgot-password | Public | Одинаковый ответ независимо от наличия email |
| POST /api/auth/reset-password | Public + reset token | Одноразовый токен |
| GET /api/csrf | Public | Токен для собственных unsafe API; no-store |
| GET /api/me | CUSTOMER/MANAGER/ADMIN | Текущий безопасный профиль |
| POST /api/bookings | CUSTOMER/MANAGER/ADMIN | Только от собственного userId из guard |
| GET /api/bookings | CUSTOMER/MANAGER/ADMIN | Только собственные брони |
| GET /api/bookings/:id | Владелец | Не раскрывает чужое бронирование |
| PATCH /api/bookings/:id/cancel | Владелец | Только неоплаченный PENDING |
| POST /api/bookings/:id/payments | Владелец | Платёж только по разрешённому статусу брони |
| GET /api/bookings/:id/payments | Владелец | Состояние своих платежей |
| GET /api/admin/vehicles | MANAGER/ADMIN | Служебный список |
| POST /api/admin/vehicles | MANAGER/ADMIN | Создать машину |
| PATCH /api/admin/vehicles/:id | MANAGER/ADMIN | Изменить разрешённые поля/статус |
| DELETE /api/admin/vehicles/:id | ADMIN | Архивировать, без физического удаления |
| PUT /api/admin/vehicles/:id/pricing | MANAGER/ADMIN | Весь набор тарифов атомарно |
| PUT /api/admin/vehicles/:id/images | MANAGER/ADMIN | Ссылки/порядок изображений |
| GET /api/admin/bookings | MANAGER/ADMIN | Все бронирования |
| GET /api/admin/bookings/:id | MANAGER/ADMIN | Служебная карточка |
| PATCH /api/admin/bookings/:id/status | MANAGER/ADMIN | Только допустимый переход |
| POST /api/admin/payments/:id/refund | ADMIN | Подтверждённый полный возврат |
| GET /api/admin/users | ADMIN | Пагинация, без passwordHash |
| PATCH /api/admin/users/:id/role | ADMIN | Роль и защита последнего ADMIN |
| PATCH /api/admin/users/:id/status | ADMIN | Блокировка и sessionVersion |
| GET /api/admin/audit-logs | ADMIN | Чтение журнала |
| POST /api/webhooks/payments/:provider | Подпись провайдера | Без cookie-сессии; dedup event |
| GET /api/health | Public | Минимальный liveness без секретов |

Разрешить конфликт путей спецификации: публичный динамический сегмент
`vehicles/[slug]` в Next.js один для карточки, availability и quote.
Не создавать рядом `[id]` с тем же URL шаблоном. Для Booking API
передавать vehicleId в body; admin использует `[id]`.

Фильтр availability не раскрывает данные занявших машину клиентов.
Status-фильтр публичного каталога не даёт доступ к ARCHIVED/MAINTENANCE.
Цена для фильтра/quote считается по датам; без дат — минимальная цена за сутки.
Пагинация: pageSize <= 50, стабильная сортировка с id как tie-breaker.
Zod whitelist входных полей, ограничение body/строк; mass assignment запрещён.

Ошибки: 400 validation, 401 отсутствие/недействительная сессия,
403 недостаточные права, 404 отсутствующая или чужая бронь,
409 конфликт, 429 rate limit, 503 инфраструктура.
Формат: error.code, error.messageKey, fieldErrors при валидации, requestId.
Публичные ошибки не содержат SQL, connection strings или stacktrace.

## 10. Rate limiting

Принять интерфейс RateLimitStore и атомарный Redis-backed limiter
для production и нескольких инстансов; память процесса только для dev/tests.
Дополнительный Redis — инфраструктурная зависимость предложенного плана.
Провайдер ещё не выбран; реальные ключи не нужны для архитектуры.

Первоначальные лимиты, настраиваемые окружением:

| Операция | Лимит |
| --- | --- |
| Credentials login | 10/10 минут на IP и 5/10 минут на нормализованный email |
| Register | 5/час на IP |
| Forgot password | 5/час на IP и 3/час на email |
| Reset password | 5/15 минут на IP и хеш токена |
| Bookings create | 10/минуту на userId |
| Payment create/refund | 5/минуту на userId |
| Admin mutations | 60/минуту на userId |
| Catalog/availability/quote | 120/минуту на IP |

Проверка Credentials внутри authorize до хеширования, чтобы её не обойти
прямым POST Auth.js callback или Server Action signIn.
Остальные проверки — в handler/service boundary.
email/token ключи хешировать с server-side secret, не писать PII в Redis key/log.
IP брать только из доверенных заголовков deploy proxy; не доверять
произвольному X-Forwarded-For. Счётчик и TTL изменяются атомарно.

При превышении — 429 и Retry-After, без раскрытия существования email.
При недоступном store auth/booking/payment mutations отвечают 503;
автоматический fail-open для них не допускается.
В dev явный memory adapter, а не скрытая подмена production.
Тесты: общие счётчики нескольких инстансов, лимит до hash, TTL и отказ store.

## 11. CSRF, cookies и webhook

Auth.js endpoints сохраняют встроенную защиту CSRF; не использовать
skipCSRFCheck и не обходить framework handlers.
Эта защита не распространяется автоматически на собственные REST API.
Источник: [Auth.js core CSRF](https://authjs.dev/reference/core).

Для собственных POST/PATCH/PUT/DELETE:

1. Сверить Origin с точным allowlist APP_ORIGIN, без wildcard.
   Нет Origin или чужой Origin в браузерном cookie API — отказ 403.
2. При наличии Sec-Fetch-Site отклонять cross-site.
3. Принимать application/json и X-CSRF-Token.
4. Использовать подписанный double-submit: случайный nonce в
   HttpOnly cookie, token = HMAC(serverSecret, nonce + userBinding);
   token выдаёт GET /api/csrf (no-store), проверка constant-time.
   После входа сменить nonce/binding и получить новый token.
5. После CSRF выполнить серверные auth/role/ownership guards.

Cookies: HttpOnly для session/nonce, SameSite=Lax, Secure на HTTPS,
production nonce cookie __Host- с Path=/ и без Domain.
В HTTP localhost использовать dev cookie без __Host-/Secure.
Не хранить session token в localStorage.
CORS по умолчанию same-origin; не добавлять Access-Control-Allow-Origin *.

GET не меняет бронь/роль/платёж. Login/logout использовать через Auth.js.
Если позже добавятся Server Actions, оставить guards внутри каждой action
и framework Origin-проверку; собственные REST routes защищать отдельно.

Payment webhook исключён из browser-CSRF/cookie guards:
проверка подписи по сырым bytes body, срока события если предоставляет provider,
dedup event и проверка amount/currency/bookingId.
Ссылка success в браузере не устанавливает PAID.
Источник концепции CSRF: [MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF).
Конкретный HMAC/double-submit контракт выше — решение проекта.

## 12. Порядок дальнейшей реализации и проверок

1. Утвердить этот документ, включая PENDING-блокировку, расчёт суток,
   отсутствие буфера, депозит отдельно, Auth.js beta и Redis limiter.
2. Этап 2: PostgreSQL adapter/env, актуализированная schema,
   initial/custom SQL migrations, local-only Decimal seed.
   Проверить миграции и повторный seed на disposable PostgreSQL.
3. Этап 3: Credentials, registration/reset, JWT callbacks, DB guards,
   rate limiting/CSRF и временные формы.
4. Этап 4/5: services/transactions, каталог, API, ownership,
   реальные PostgreSQL тесты конкуренции.
5. Этап 6: временные таблицы админки с теми же services/guards.
6. Этап 7: mock adapters, затем выбранные платежи/карты/уведомления,
   signed webhook, outbox worker.
7. Этап 8/9: E2E, CI, production deploy и мониторинг.

Каждый этап: lint, typecheck, test, build.
Дополнительно БД: migrate на чистой БД, проверка pg_constraint,
прямые SQL конфликты, concurrency integration tests.
Auth: сброс/блокировка отзывают старую сессию; CUSTOMER не получает ADMIN
через body/session.update; прямые API защищены без Proxy.
Playwright: регистрация -> вход -> каталог -> booking ->
manager confirmation -> обновлённый статус клиента.

CI: PostgreSQL 16 service, test-only Redis или контролируемый test store,
npm ci, Prisma generate/migrate deploy, checks и E2E.
Deployment: Node runtime, managed PostgreSQL с btree_gist,
secrets через environment, job/worker для notifications.
Миграции отдельным шагом release; seed в production не запускать.
Официальные документы описывают механизмы; факт работы проекта
подтверждается только этими проверками после реализации.

## 13. Что заменяется после дизайна

Заменить app page/layout presentation, globals.css и дизайн-токены,
временную навигацию, каталог/карточки, таблицы, формы и галереи,
плейсхолдеры фотографий, тексты, шрифты и responsive layout.
Добавить согласованную визуальную систему и RU/EN/KA представление.

Сохранить services/repositories/validators, SQL constraints,
форматы денег/дат, RBAC, API DTO и тесты инвариантов.
Новый дизайн может потребовать добавочных read endpoints,
но не отменяет серверную авторизацию и защиту бронирования.

## 14. Условия принятия Этапа 1

- Спецификация доступна как docs/mvp-spec.md, кодовые блоки Markdown закрыты.
- Текстовые файлы UTF-8 без BOM, LF и финальная новая строка.
- Есть .editorconfig/.gitattributes и точная таблица установленных версий.
- Статус Auth.js/Zod не выдаётся за уже подключённый функционал.
- Типы/индексы/onDelete, API, деньги/даты и concurrency описаны.
- Реальные изменения schema/services/handlers отложены до утверждения.
- Предложенный план можно реализовать и проверить по этапам.

## Решения и поправки

Решения утверждены для MVP. При расхождении с разделами выше действуют
именно эти поправки; исходный текст плана сохранён для истории обсуждения.

- PENDING и CONFIRMED занимают автомобиль. TTL у PENDING нет. На пользователя
  допускается не более трёх активных PENDING; счётчик проверяется под
  блокировкой User внутри той же транзакции, что создаёт Booking.
- Длительность аренды — каждые начатые 24 часа. В Booking сохраняются точные
  моменты получения и возврата. Льготный период и буфер равны нулю;
  оба значения задаются в одном конфиге, которым пользуются расчёт и поиск
  доступности.
- totalAmount хранит только стоимость аренды, depositAmount — залог отдельно,
  DTO отдаёт totalDue. Онлайн оплачивается только аренда; залог вносится
  при выдаче. PaymentPurpose.DEPOSIT и разделение платежей по назначению
  исключены из MVP.
- Booking.idempotencyKey и requestHash nullable. Заголовок Idempotency-Key
  необязателен. Если он передан, сохраняются оба поля и действует
  UNIQUE(userId,idempotencyKey); если отсутствует — оба поля NULL.
- Для ограничений диапазонов PricingRule используется int4range.
- В MVP нет Redis: RateLimitStore с in-memory реализацией. Перед production
  требуется общий атомарный store для нескольких инстансов либо deployment
  с доказанно единственным экземпляром и отдельным ограничением на ingress.
  Локальная память одного инстанса не защищает кластер.
- CSRF в MVP: точный allowlist Origin, SameSite=Lax для cookie и обязательный
  Content-Type: application/json для собственных unsafe API. HMAC
  double-submit и GET /api/csrf отложены; Auth.js сохраняет свою встроенную
  CSRF-защиту. Из API-таблицы выше /api/csrf исключён.
- PaymentWebhookEvent не входит в начальную схему; появится вместе с
  выбранным реальным платёжным провайдером.
- Осознанное отличие от исходного ТЗ: публичный маршрут доступности —
  GET /api/vehicles/:slug/availability. Отдельный GET /api/bookings
  возвращает только бронирования текущего пользователя;
  общий список доступен менеджеру и администратору через
  GET /api/admin/bookings.
- Этап 2 включает схему, Prisma 7 PostgreSQL adapter, миграции и seed.
  Auth.js будет установлен позже. Docker и применение миграций выполняются
  владельцем проекта в окружении с доступным PostgreSQL.
