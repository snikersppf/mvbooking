#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${MVBOOKING_PROJECT_DIR:?Set deployed project directory}"
: "${MVBOOKING_ENV_FILE:?Set Compose environment file}"
: "${BACKUP_AGE_IDENTITY_FILE:?Set offline age private identity file for this restore only}"
archive=${1:?Usage: restore-test.sh encrypted.dump.age isolated_restore_test}
database=${2:?Supply a newly created, empty database ending in _restore_test}
[[ "$database" =~ ^[a-z][a-z0-9_]*_restore_test$ ]] || { printf '%s\n' 'Refusing a database without _restore_test suffix.' >&2; exit 1; }
[[ -f "$archive" && "$archive" = *.dump.age ]] || exit 1
compose=(docker compose --env-file "$MVBOOKING_ENV_FILE" -f "$MVBOOKING_PROJECT_DIR/docker-compose.prod.yml")
# Never --clean/--create: only an explicitly prepared empty restore-test database is allowed.
# The archive is piped directly through authenticated decryption into pg_restore.
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$archive" |
  "${compose[@]}" exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore --username="$POSTGRES_USER" --dbname="$1" --exit-on-error --single-transaction --no-owner --no-acl' sh "$database"
printf '%s\n' 'Restore completed. Validate data and application behavior before any production cutover.'
