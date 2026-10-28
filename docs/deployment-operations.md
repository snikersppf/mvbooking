# Production operations

This is a deployment procedure, not evidence of a deployed production system.
Docker, migrations, real credentials, external delivery and offsite restore must
be verified on the target infrastructure before launch. Never run the local seed
against production. The operator commands below do not load the development `.env`.

## Deployment and HTTPS

Use the existing PostgreSQL 16 + Next standalone Compose deployment. Caddy is the
only published entry point (TCP 80/443, optionally UDP 443 for HTTP/3). Neither
PostgreSQL nor the application publishes a host port. Keep the Docker socket and
internal networks restricted to trusted operators. A Docker-group member has
host-equivalent privilege even if their service runs under a non-root Unix user.

On a Linux server, install Docker with Compose v2 and deploy the repository at
`/opt/mvbooking`. Create a dedicated `mvbooking` operator account. Store the
production environment outside the repository, for example
`/etc/mvbooking/production.env`, mode `0640`, owner root, group mvbooking. Do not
print `docker compose config` with secrets or enable shell tracing (`set -x`).

Required configuration:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`; `DATABASE_URL` must connect
  to host `postgres` on the private Compose network, URL-encoding credentials.
- `APP_ORIGIN` and `AUTH_URL`: the same real HTTPS origin, without trailing slash, path/query,
  custom port or credentials. `APP_ORIGIN` also configures Caddy's hostname.
- Independently generated `AUTH_SECRET` and `CRON_SECRET`: at least 32 bytes,
  no whitespace. Rotate pre-launch development secrets.
- `TRUST_PROXY_HEADERS=true` is explicitly enforced by this Compose deployment.
  It is valid only because Caddy is the sole public ingress.
- `RESEND_API_KEY`, verified `EMAIL_FROM`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_MANAGER_CHAT_ID`: see notification operations documentation.

The runner refuses startup for inconsistent HTTP/HTTPS origins or invalid
secrets. Secrets are runtime variables, not build arguments. `.dockerignore`
excludes env files, keys, `.git`, host `node_modules`, tests and seed source.
The operations image includes the existing Prisma client and TypeScript runner;
the separate migrator retains only the deployment migration command.

Create DNS A (and AAAA only when IPv6 works) records for the actual hostname.
Open 80/443 to Caddy and SSH only to operators. Caddy obtains and renews the
certificate; persistent `caddy_data` stores its ACME state. Set a CAA policy only
after selecting a compatible ACME issuer. Do not add fictitious DNS values.

```bash
dc() {
  docker compose --env-file /etc/mvbooking/production.env \
    -f /opt/mvbooking/docker-compose.prod.yml "$@"
}
dc --profile ops build app worker migrate maintenance create-admin
dc up -d postgres
dc --profile ops run --rm -T migrate
# Continue only after successful migrate deploy.
dc up -d app worker proxy
dc ps
```

Never use `migrate dev`, `migrate reset` or `db push` for production. For managed
PostgreSQL arrange `btree_gist` installation privileges before `migrate deploy`.
Use a migration account when the runtime role cannot create extensions; grant
the runtime role only required access to application tables and sequences.

`deploy/Caddyfile` overwrites `X-Forwarded-For` and `X-Real-IP` with the actual
peer address, overwrites protocol and host, and removes `Forwarded`. The existing
app IP resolver therefore sees the client, including when the client supplies
forged forwarding headers. The configuration assumes clients connect directly
to Caddy. Do not put a CDN/load balancer in front without configuring its exact
trusted ranges and reviewing both hops; otherwise the edge IP becomes every
client's rate-limit IP. CORS remains same-origin; no wildcard CORS is added.

Every request body is capped at 1 MB by Caddy before the upstream reads it.
Oversized bodies return HTTP 413. This covers authentication and admin JSON,
including clients omitting or lying about Content-Length. Existing vehicle
forms send image URLs (at most 30), not uploaded image files; their validated
payloads fit within this bound. This limit is especially important because the
current admin handler parses JSON concurrently with its authorization guard.
There must be no alternate public ingress bypassing this cap. On the target
server, send a >1 MB body to an API endpoint and confirm rejection without an
application mutation. Static config tests do not replace this live check.

Source: [Caddy request_body/max_size](https://caddyserver.com/docs/caddyfile/directives/request_body).

Production acceptance checks, from a separate external client:

1. HTTP redirects to HTTPS; certificate validation succeeds without `-k`.
2. Call `/api/vehicles` with and without forged `X-Forwarded-For`, `X-Real-IP`
   and `X-Forwarded-Proto`. In the private database inspect only the relevant
   `RateLimitCounter.key` (`public-read:ip:...`), without publishing client IPs.
   Both calls must increment the same real public-client IP key, not the forged
   IP or the proxy's private address. Repeat from another public network and
   verify a separate key. No public diagnostic endpoint exposes IPs.
3. Port 3000 and PostgreSQL 5432 are unreachable externally; a browser login
   sets Secure/HttpOnly session cookies and `/admin` checks the current DB role.

Sources: [Caddy proxy headers](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy),
[automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## First administrator

`create-admin` uses the registration/password rules and existing scrypt verifier,
creates an ACTIVE ADMIN and an audit record in one transaction. It takes the
same advisory lock as role/status changes. It refuses to bootstrap another
administrator when any ADMIN already exists, including an inactive one. An
existing matching active ADMIN is a no-op: neither password nor sessions change.
An existing CUSTOMER/MANAGER email is never promoted by this command.

Use a hidden prompt; the password is sent through stdin, never an argument or
logged output. Use a password manager, a unique strong password and a real
operator-controlled email. The command does not send an email itself.

```bash
read -r -p 'Admin email: ' admin_email
read -r -p 'Admin name: ' admin_name
read -r -s -p 'Admin password: ' bootstrap_password
printf '\n'
printf '%s' "$bootstrap_password" | dc --profile ops run --rm -T create-admin "$admin_email" "$admin_name"
unset bootstrap_password admin_email admin_name
```

Check the command exit status before continuing. Sign in at `/login`, open
`/admin`, and verify the current DB role is ADMIN. Re-run with the same email
to confirm a no-op; it is not a password-reset mechanism. Further admin changes
use the audited admin UI. Unit tests exercise the created scrypt hash through
the actual credentials authorizer; a real DB + browser login remains a deployment
acceptance check.

## Scheduled maintenance

`scripts/run-scheduled-maintenance.ts` calls the existing authenticated
`POST /api/cron/cancel-expired` over the private network and then calls the existing
cleanup service. It never forwards the bearer token across redirects. The cron
endpoint rejects missing/incorrect tokens and a missing/short configured secret.
Booking cancellation retains the existing User → Vehicle → Booking locks and
audit/outbox transaction. It cancels PENDING records older than 24 hours.
Cleanup removes `RateLimitCounter.resetAt` older than one hour and
`AdminMutationResult.createdAt` older than 24 hours.

Install the provided systemd units in `/etc/systemd/system` as the server
administrator. They assume `/opt/mvbooking` and a `mvbooking` user/group with
Docker access. Keep `/etc/mvbooking/operations.env` root-owned mode `0640`, group
mvbooking, using the variable names in `deploy/operations.env.example`.
`MVBOOKING_PROJECT_DIR=/opt/mvbooking` and
`MVBOOKING_ENV_FILE=/etc/mvbooking/production.env` are paths, not secrets.
No script sources that file as shell code: systemd parses EnvironmentFile and
Compose parses its env file.

```bash
systemctl daemon-reload
systemctl enable --now mvbooking-maintenance.timer mvbooking-backup.timer
systemctl start mvbooking-maintenance.service
systemctl list-timers 'mvbooking-*'
journalctl -u mvbooking-maintenance.service --since today
```

Maintenance runs every 15 minutes (PENDING expiry can therefore lag by about
15 minutes, plus scheduler/queue delay). Persistent timers catch up after a
restart. A non-zero exit marks the systemd job failed. Configure monitoring to
alert on failed units or no successful maintenance in 30 minutes; journald
alone is not an alert channel. Check unauthenticated POST returns 401 without
changing records, then verify an authorized scheduled run and DB cleanup.

## Encrypted offsite PostgreSQL backup

Install `age`, `rclone`, `flock` and Bash on the server. PostgreSQL tools run
inside the existing postgres:16 container; nothing exposes the database port.
Create `/var/backups/mvbooking` mode `0700`, owned by the operator. Provision:

- `BACKUP_AGE_RECIPIENTS_FILE`: an absolute file path containing age **public**
  recipients. Generate the key on a separate trusted machine; keep the private
  identity in an offline/password-manager recovery vault outside this server.
- `RCLONE_CONFIG`: private configuration file, mode `0600`, readable by the
  operator. Configure a remote for separate storage/account/server, restricted
  to the backup prefix. Store provider keys there, never in command arguments.
- `BACKUP_REMOTE`: `remote-name:bucket-or-directory/mvbooking`, a dedicated
  prefix ending in `/mvbooking`, not the bucket root. It must be physically
  outside the application server. Select HTTPS transport/provider encryption,
  versioning and retention/object lock in that provider where supported.
- `BACKUP_LOCAL_RETENTION_DAYS` / `BACKUP_REMOTE_RETENTION_DAYS`: positive
  integers; defaults 7 / 30, maximum 999; remote retention must be at least local.

`deploy/backup.sh` takes a non-overlapping `flock`, streams `pg_dump --format=custom`
through age, copies the encrypted archive offsite and reads it back to check
integrity. Only after verification does it prune old archives matching the
application-specific filename/prefix. Partial dumps are removed; a completed
encrypted dump is retained locally if upload/verification fails. Commands fail
closed with non-zero exit; systemd captures failure. Configure independent alerts
for failed backup and absence of a successful offsite copy for >26 hours.

The supplied timer runs daily at 02:30 UTC; this implies a target RPO of up to
24 hours. Agree RPO/RTO with the owner; enable managed PITR/WAL archiving if loss
of a day's bookings is unacceptable. Retention deletion is deliberate: verify
the chosen dedicated prefix and policy before enabling. Object-lock retention
must allow planned lifecycle deletion, or configure provider lifecycle to match;
an unexpired immutable object may make the script fail and alert.

```bash
systemctl start mvbooking-backup.service
journalctl -u mvbooking-backup.service --since today
```

A successful script is not a successful restore drill. Validate offsite access
from a second host/operator account and preserve recovery credentials offline.
Keep an inventory of image storage, DNS, app configuration and secrets as well;
the database dump does not back up Caddy state, images, env files or provider
accounts. Do not include live secrets in an unencrypted repository backup.

Sources: [PostgreSQL 16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html),
[rclone check](https://rclone.org/commands/rclone_check/),
[rclone retention filters](https://rclone.org/filtering/),
[age](https://age-encryption.org/).

## Restore drill and recovery

At least monthly, and before first production launch, download an archive from
offsite storage onto an isolated recovery host. Use PostgreSQL 16 and the same
migrations/application release. Do not start notification workers or external
delivery against restored personal data.

1. Retrieve the encrypted archive using the restricted rclone configuration and
   retrieve the private age identity independently. Keep both mode `0600`.
2. On the recovery deployment create a new, empty database whose name ends
   `_restore_test`. Use the operator's DB role; prepare `btree_gist` privileges.
   Do not point a running application or worker at the recovery database.
3. Export `MVBOOKING_PROJECT_DIR`, `MVBOOKING_ENV_FILE` (recovery deployment),
   `BACKUP_AGE_IDENTITY_FILE` (temporary secure file) and execute:

   ```bash
   bash deploy/restore-test.sh /secure/recovery/archive.dump.age mvbooking_restore_test
   ```

4. The script rejects other database names, uses `--exit-on-error` and
   `--single-transaction`, and never uses `--clean`. Validate migration history,
   row counts, the latest bookings/audit records, financial snapshots, constraints
   including `booking_no_active_overlap`, and application read/login flows with
   external sending disabled. Record archive ID, restore duration and result.
5. Delete the temporary decrypted-key copy through your secure host policy and
   retire the isolated recovery DB only after documenting results.

For an incident, first stop app writers, scheduler and worker. Preserve the old
volume, restore into a separate database/instance, validate, and update runtime
`DATABASE_URL` for an explicit cutover. Reconcile bookings made since the dump,
notification deliveries and any old idempotency state before restarting the
worker. Restore does not automatically rotate secrets or authorize previously
revoked sessions; review `sessionVersion` rollback and rotate `AUTH_SECRET` to
invalidate old JWTs after a recovery that rewinds account security changes.
Do not overwrite the only production database or delete its volume as a recovery
shortcut.

## Required live evidence before launch

- Public certificate/HTTPS and forwarded-IP spoofing checks on the actual server.
- Bootstrap admin login through the actual Auth.js + DB + protected admin page.
- Authorized cron job success, unauthorized rejection and cleanup evidence.
- Continuously running/restarting worker with real Telegram and email delivery.
- First verified offsite encrypted backup and documented isolated restore drill.
- Alerts for failed jobs, failed delivery, certificate renewal and unhealthy app.

Until these checks have evidence, infrastructure is **NOT READY FOR PRODUCTION**.

## Stage 10 database-role update

For the current contact-enquiry release use the role/enrollment gates in
[production-checklist.md](production-checklist.md#stage-1010--separate-database-users).
The public application, notification worker, maintenance and trusted staff enrollment
use DATABASE_URL for mvbooking_runtime. Only the migration job receives
MIGRATOR_DATABASE_URL for mvbooking_migrator; the migrator owns the schema, app tables
and enums. Do not give its URL to a public application container.

Before the first release, stop app/worker traffic, back up the dedicated database,
and run deploy/provision-database-roles.sql as the database administrator with
psql -X and passwords in protected environment variables (not command arguments).
Review existing object ownership: the script refuses residual runtime-owned schemas,
extensions or routines rather than silently preserving a DDL path. Then run the
migration image: it deploys migrations and applies deploy/grant-runtime-access.sql.
If the permission step fails, leave runtime services stopped. Repeat that permission
step after every future migration; new tables default to no runtime access.

Set the independent MFA_ENCRYPTION_KEY (base64, 32 random bytes) in the app and
interactive enrollment service. Enroll each staff account with
`docker compose -f docker-compose.prod.yml --profile ops run --rm enroll-staff-totp staff@example.org`.
Run this in a private terminal without transcript/log collection: the seed and backup
codes are displayed once. Confirm the authenticator code and wait for its next step
before signing in. Never rotate/delete the encryption key without an audited recovery
plan for enrolled users. None of these live deployment operations was run by Codex.
