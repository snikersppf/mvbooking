# Production notifications

The booking transaction continues to write the existing `Notification` outbox.
No network call runs inside booking transactions. `scripts/notification-worker.ts`
claims due rows with `FOR UPDATE SKIP LOCKED`, commits a 60-second lease, and then
sends with a 15-second HTTP timeout. Completion checks the attempt number and lease
so an old worker cannot overwrite a newer claim. Password reset reuses this queue
with the migration described below.

Each email booking event creates one Telegram outbox row in the claim transaction,
deduplicated by `eventKey=telegram:<email notification id>`. The manager receives
only the booking ID and its authenticated admin URL; no customer name, email, phone,
vehicle, dates or price. Telegram link previews are disabled. Customer emails contain
the event and a link to their own booking list. Delivery payloads are snapshotted
before the first send so retries use identical request bodies.
Legacy booking events may contain `payload.provider="mock"`; that historical
metadata is not a provider selector. The production worker always uses its
configured Resend/Telegram adapters and replaces that payload with the delivery
snapshot. It rejects a mock provider result rather than marking it as sent.

## Required external setup and environment

- `AUTH_SECRET`: the same strong secret used by the app, required by the reset worker.
- `APP_ORIGIN`: the production HTTPS origin, identical to the public site origin.
- `RESEND_API_KEY`: restricted sending key from the project's Resend account.
- `EMAIL_FROM`: one verified sender email address (bare address, without a display name).
- `TELEGRAM_BOT_TOKEN`: private bot token from Telegram BotFather.
- `TELEGRAM_MANAGER_CHAT_ID`: numeric ID of the private manager chat/group. Start the
  bot or add it to the group first; restrict membership to authorized managers.
- `DATABASE_URL`: runtime database connection. Never load development `.env` on the server.

Verify the sender domain in Resend's Domains dashboard. Copy the **actual** SPF and
DKIM records displayed for your domain/region into DNS; do not copy sample records.
If SPF already exists on the same name, merge the authorized mechanisms rather than
publishing multiple SPF records. Enable DKIM and confirm the domain's verified status
in Resend. Review DMARC alignment for `EMAIL_FROM`; publish a DMARC policy and a real
monitored reporting address chosen by the owner. Start with monitoring if existing
mail senders have not been audited, then tighten policy after inspecting reports.
The repository cannot publish or verify ownership of your DNS records.

Sources: [Resend domains](https://resend.com/docs/dashboard/domains/introduction),
[Resend email API](https://resend.com/docs/api-reference/emails/send-email),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Telegram sendMessage](https://core.telegram.org/bots/api#sendmessage).

## Run and monitor

Use the `worker` service in `docker-compose.prod.yml`; it is restarted automatically
with `restart: unless-stopped`. Alternatively run `npm run notifications:worker`
under the server's existing process supervisor with the same protected environment.
Do not run both unless intentionally scaling. Each process polls every five seconds
when idle and sends at most one notification per second; multiple processes share
the database queue but also share the provider's quota. SIGTERM finishes the current
send before disconnecting. Monitor process/container restarts and the following
read-only query, for example from your existing monitoring system:

```sql
SELECT "channel", "status", count(*), min("createdAt") AS oldest
FROM "Notification"
GROUP BY "channel", "status";
```

Alert on any `FAILED` row, a growing/aged `PENDING` queue, repeated worker restarts,
and the fixed warning `Notification requires manual delivery review`. Logs do not include
provider response bodies, token-bearing Telegram URLs, reset links or customer data.
`SENT` means accepted by the API, not proven delivery to the recipient. Monitor
Resend's delivery/bounce dashboard and suppress or correct invalid recipients operationally.

## Retry and duplicate guarantees

Email sends use `Idempotency-Key: notification/<id>`. Resend keeps keys for 24 hours;
automatic retries stop before 23 hours from the frozen first-attempt timestamp, or
after eight attempts. An old backlog event receives a fresh window only on its first
send; retries never refresh it. Legacy delivery snapshots without a timestamp use
the outbox creation time conservatively.
Transient email network/429/5xx errors retry with exponential backoff. Delivery
snapshots include the original recipient/message; do not edit them during retries.
Changing `EMAIL_FROM` during an active retry may produce a Resend idempotency conflict;
drain the queue before changing the sender address.

Telegram has no sendMessage idempotency key. Only an explicit API 429 is automatically
retried (respecting `retry_after`). A timeout, invalid/5xx response or an expired lease
after a crash becomes `FAILED` and requires manual review. This prevents automatic
duplicates but may require a manual send if the original request never arrived.
Exactly-once delivery cannot be guaranteed by the Telegram API.

For a failed/uncertain delivery, inspect the restricted manager chat or Resend dashboard
using the booking ID and the notification ID. Record the decision in the operations
incident log. If confirmed delivered, reconcile that specific outbox row to `SENT`;
otherwise send manually and reconcile it. Do **not** bulk-reset attempts/status or
requeue an uncertain message outside Resend's 24-hour window: this can duplicate sends.
Investigate `TELEGRAM_LEASE_EXPIRED_REVIEW_REQUIRED`, lost-claim warnings and
`DELIVERY_RETRY_LIMIT_REVIEW_REQUIRED` before declaring the pipeline healthy.

Before the first worker start on an existing database, review pending historical mock
events and resolve them explicitly. Otherwise those old events will be delivered now.

## Password reset

Production immediately persists a `PASSWORD_RESET` email job in `Notification` and
returns the same generic acceptance response for every valid email address. The HTTP
request does not look up accounts, create tokens, call providers or wait for a timer.
Only queue persistence is awaited; database failures return the usual service error.
Apply the password-reset queue migration before deploying the app and worker.

The worker looks up the account and silently completes unknown/inactive addresses.
For an active account it creates a one-hour token, stores only its SHA-256 hash and
sends the HTTPS reset link through the existing email provider and retry mechanism.
Reset notifications never fan out to Telegram. The worker needs the same strong
`AUTH_SECRET` as the app: HMAC with a separate password-reset context reconstructs a
stable token from the notification ID, so neither the raw token nor the delivery body
is persisted in the outbox or logs. Keep this secret stable while requests are pending;
rotation invalidates pending delivery retries and users must request fresh links.
The queued email and first-attempt timestamp are removed after success or discard.

A retry uses the same link and idempotency key without extending token lifetime.
Expired, consumed and superseded tokens are never recreated. Atomic consumption,
sessionVersion increment and token deletion still ensure one use and session revocation.
Monitor queue age, failed notifications and worker health: a stopped worker or broken
provider delays account recovery. Development mock links remain development-only.

## Release verification still required

Tests use injected HTTP responses/providers and a separate `_test` PostgreSQL DB.
They do not contact Telegram or Resend. Before launch, the owner must perform an
authorized real test: booking → outbox → worker → manager Telegram + customer email;
confirmation → customer email; forgot-password → received link → new password → login;
expired/reused reset link rejected. Verify inbox/spam, sender domain status, manager
chat membership, queue monitoring and process restart after failure. Without these
checks and configured credentials, production notifications/recovery are unverified.
