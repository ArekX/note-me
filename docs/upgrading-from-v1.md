# Upgrading from NoteMe v1 to v2

NoteMe v2 is a rewrite in Go. Your notes, folders, tags, files, shares,
reminders and history come along, but the database must be converted once
with `noteme-upgrade` before v2 can use it. NoteMe v2 refuses to start on a
database that has not been upgraded, so nothing is changed by accident.

What changes for you:

- **Passwords are needed once.** Password hashes and protected notes can only
  be converted with each user's password, so the upgrade asks for every
  user's password (the input is visible on screen). Leave one empty to skip
  that user: they can sign in again after an administrator sets a new
  password in Settings → Users, but their protected notes cannot be
  recovered.
- **Passkeys are removed.** Users register them again under Profile →
  Passkeys.
- **Uploaded files move out of the database** into `FILES_LOCATION`.
- **Users deleted in v1** are removed for good, together with their data.
- **One port.** The websocket is now served on `/ws` of the webserver port
  (8000); port 8080 is no longer used.
- **Settings changed.** `SQLITE_DATABASE_LOCATION` is replaced by
  `DATABASE_DSN` (`sqlite:///app/data/database.sqlite`). `WEBSOCKET_PORT`,
  `SOCKET_HOSTNAME`, `COOKIE_DOMAIN`, `RUN_MIGRATIONS_ON_STARTUP` and
  `DISABLE_SERVICE_PERIODIC_TASKS` are gone. `BACKUP_ENCRYPTION_KEY` and
  `AI_ENCRYPTION_KEY` are new and required. See
  [Configuration](../README.md#configuration).
- **Backups are encrypted** and a local backup target's location is now a
  folder name inside `LOCAL_BACKUP_ROOT_LOCATION`, not an absolute path. Edit
  local targets from v1 (for example `/app/backup` becomes `nightly`) in
  Settings → Backups after the upgrade. Backups made by v1 cannot be restored
  by v2; keep them together with the v1 image in case you need to go back.

## Upgrade with Docker Compose

These steps assume the v1 setup from the v1 `docker-compose.example.yml`
(database in `./data`, local backups in `./backup`).

1. Stop NoteMe: `docker compose down`
2. Back up the database: `cp -a data data-v1-backup`
3. Update `docker-compose.yml` from the new
   [docker-compose.example.yml](../docker-compose.example.yml): keep your
   domain in `APP_URL`, set `BACKUP_ENCRYPTION_KEY` and `AI_ENCRYPTION_KEY` to
   secrets of your own, drop the 8080 port and the removed variables, and add
   the `./files` volume.
4. The v2 image runs as an unprivileged user (uid 65532) instead of root, so
   give it the data folders:
   `mkdir -p files backup && sudo chown -R 65532:65532 data files backup`
5. Pull the new image: `docker compose pull`
6. Run the upgrade and enter each user's password when asked:
   `docker compose run --rm --entrypoint /app/noteme-upgrade note-me`
7. Update the reverse proxy: remove the `/websocket-server` location and
   forward `/ws` to port 8000 as shown in
   [Reverse proxy](../README.md#reverse-proxy).
8. Start NoteMe: `docker compose up -d`
9. Sign in, register passkeys again and fix local backup target locations in
   Settings → Backups.

## Upgrade without Docker

1. Stop NoteMe v1 and copy its database file somewhere safe.
2. Build NoteMe v2 (see [Building](../README.md#building)).
3. Set `DATABASE_DSN` to `sqlite://<path to the v1 database>` and
   `FILES_LOCATION` to the folder for uploaded files, then run
   `./bin/noteme-upgrade` and enter each user's password when asked. From a
   source checkout, `make upgrade DB=path/to/database.sqlite FILES=files`
   does the same.
4. Set the rest of the configuration (see
   [Configuration](../README.md#configuration)) and start `./bin/noteme`.

The upgrade only works on SQLite and is safe to run again. To move to
PostgreSQL or MySQL afterwards, make a backup in v2 and restore it into the
new database (see [Backups and restore](../README.md#backups-and-restore)).
