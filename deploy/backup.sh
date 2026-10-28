#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run by systemd with an EnvironmentFile; never source a shell env file.
: "${MVBOOKING_PROJECT_DIR:?Set the absolute deployed project directory}"
: "${MVBOOKING_ENV_FILE:?Set the absolute Compose environment file}"
: "${BACKUP_AGE_RECIPIENTS_FILE:?Set the public age recipients file}"
: "${BACKUP_REMOTE:?Set an rclone remote dedicated to MVBooking backups}"
: "${RCLONE_CONFIG:?Set the private rclone configuration file}"
backup_dir=/var/backups/mvbooking
local_days=${BACKUP_LOCAL_RETENTION_DAYS:-7}
remote_days=${BACKUP_REMOTE_RETENTION_DAYS:-30}
[[ "$MVBOOKING_PROJECT_DIR" = /* && "$MVBOOKING_ENV_FILE" = /* ]] || exit 1
[[ "$BACKUP_REMOTE" =~ ^[a-zA-Z0-9_-]+:[a-zA-Z0-9_./-]+/mvbooking$ && "$BACKUP_REMOTE" != *..* ]] || exit 1
[[ "$local_days" =~ ^[1-9][0-9]{0,2}$ && "$remote_days" =~ ^[1-9][0-9]{0,2}$ ]] || exit 1
(( remote_days >= local_days )) || exit 1
for program in docker age rclone flock; do command -v "$program" >/dev/null; done
[[ -d "$backup_dir" && ! -L "$backup_dir" ]] || exit 1
exec 9>"$backup_dir/.backup.lock"
flock -n 9 || { printf '%s\n' 'Backup already running.' >&2; exit 1; }
job_dir=$(mktemp -d "$backup_dir/.partial.XXXXXX")
filename="mvbooking-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump.age"
archive_complete=false
cleanup() {
  result=$?
  set +e
  if [[ -f "$job_dir/$filename" ]]; then
    if [[ "$archive_complete" = true ]]; then
      mv -- "$job_dir/$filename" "$backup_dir/$filename"
    else
      rm -- "$job_dir/$filename"
    fi
  fi
  rmdir -- "$job_dir"
  if (( result != 0 )); then printf '%s\n' 'Database backup failed; check the private service journal and offsite storage.' >&2; fi
  exit "$result"
}
trap cleanup EXIT
compose=(docker compose --env-file "$MVBOOKING_ENV_FILE" -f "$MVBOOKING_PROJECT_DIR/docker-compose.prod.yml")

# pg_dump reads credentials inside the existing postgres container; no password in argv.
# The pipe encrypts immediately, so no plaintext dump is written to the server filesystem.
"${compose[@]}" exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-acl' |
  age --recipients-file "$BACKUP_AGE_RECIPIENTS_FILE" --output "$job_dir/$filename"
test -s "$job_dir/$filename"
archive_complete=true
rclone copyto --config "$RCLONE_CONFIG" "$job_dir/$filename" "$BACKUP_REMOTE/$filename"
# Download/check the new encrypted archive before pruning any older backup.
rclone check --config "$RCLONE_CONFIG" --one-way --download "$job_dir" "$BACKUP_REMOTE"
mv -- "$job_dir/$filename" "$backup_dir/$filename"
find "$backup_dir" -maxdepth 1 -type f -name 'mvbooking-*.dump.age' -mtime "+$local_days" -delete
rclone delete --config "$RCLONE_CONFIG" --min-age "${remote_days}d" --include 'mvbooking-*.dump.age' "$BACKUP_REMOTE"
printf '%s\n' 'Encrypted database backup verified offsite; retention completed.'
