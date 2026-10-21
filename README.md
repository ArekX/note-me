# NoteMe

NoteMe is a simple, note-taking app with powerful features which help you to
keep the ownership of your notes and keep them organized however you see fit.

<p>
  <img src=".github/screenshot-1.jpg" alt="Login page" width="32%" />
  <img src=".github/screenshot-2.jpg" alt="Dashboard" width="32%" />
  <img src=".github/screenshot-3.jpg" alt="Note view" width="32%" />
</p>

## Features

- **Markdown support**. Notes are written and shown using markdown. All standard
  markdown syntax is supported with additional flavors like task lists,
  footnotes, tables and extensions special to NoteMe like showing dynamic table
  of contents, note links and listing notes from a specific group.
- **Mermaid diagrams**. Code blocks marked with the `mermaid` language are
  rendered as [Mermaid](https://mermaid.js.org/) diagrams, letting you embed
  flowcharts, sequence diagrams, class diagrams and more directly in your notes.
- **Organize your notes**. You can tag your notes, store them in any kind of
  groups or subgroups making it easy to create an exact structure you want.
- **Multiple users welcome**. NoteMe supports multiple users with different
  roles, each user has its own space for notes so that everyone on the same
  NoteMe server can have their own folder structure.
- **Sharing notes**. Notes created can be shared internally between users or to
  everyone outside by creating a share link.
- **Remind yourself of important notes**. You can set one-time or recurring
  reminders for your own notes or the notes shared with you so that you never
  forget an important task.
- **History of changes**. Every saved change to your note is recorded in the
  history so that you can easily compare changes or go back and forward in time.
- **Note files**. You can upload any kind of file into NoteMe and use it in your
  notes as an image or make it downloadable. Files can be made private or public
  so that you can control who has access to them.
- **Protect your notes**. Notes can be protected with your password meaning they
  will be encrypted at rest in the database so that nobody except you can see
  their contents, not even administrators, not even by anyone accessing the
  database directly.
- **Backup support**. Daily backups can be created by NoteMe and stored on the
  server location or on AWS S3. You can specify multiple backup targets so that
  you can backup to more than one place.
- **Easy login with Passkeys**. You can setup a login into your notes by only
  using secure Passkey standard without even needing to enter a password.
- **Import/Export your data**. You can import all of your existing notes into
  NoteMe or create a full export of all of your notes and files.
- **AI assistant**. Administrators connect Ollama, OpenAI (or a compatible
  server) or Claude, and users chat with an assistant that works on their notes,
  folders, reminders and sharing with their own permissions. Actions that cannot
  be undone wait for the user to allow them, and protected notes are only read
  after the user agrees.
- **Recycled Notes**. Deleted notes are kept in recycle bin for 30 days and can
  be retrieved by you at any time or fully deleted.
- **Easily hostable**. NoteMe is a single static binary with no runtime
  dependencies (the database drivers are pure Go), or you can run it as a
  docker container using one of the prebuilt container images. Data is kept in
  SQLite, PostgreSQL or MySQL.

# Development and Contributing

Requirements:

- [Go](https://go.dev/dl/) 1.27.2 and [Node.js](https://nodejs.org/) 24
  (both pinned in `.tool-versions` for [asdf](https://asdf-vm.com/))
- `make`
- [Docker](https://docs.docker.com/engine/install/) with Compose (or Podman,
  `DOCKER=podman`) for the PostgreSQL and MySQL tests in `make test`

1. Copy the environment example file: `cp .env.example .env` to override
   defaults. This is optional as `.env.defaults` will be loaded if this step is
   omitted.
2. Install dependencies: `make deps`
3. Install git hooks: `make setup-githooks` (`make check` before every commit,
   `make test` before every push)
4. Start the development servers: `make dev`

`make dev` runs the Go server (API and websocket on `http://localhost:8000`) and
the Vite dev server with hot reload on `http://localhost:5173`, which proxies
`/api`, `/file` and `/ws` to the Go server. Open `http://localhost:5173` during
development. In development uploaded files are kept in `./files` next to
`database.sqlite`.

On first run, administrator user will be created with username `admin` and
password `admin`; the password must be changed at the first login.

Useful targets (`make help` lists them all):

| Target                                 | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `make test`                            | Run Go tests, database tests and frontend (vitest) tests    |
| `make test-databases`                  | Database tests against PostgreSQL and MySQL in Docker       |
| `cd frontend && npm run test:coverage` | Frontend tests with a coverage report (`frontend/coverage`) |
| `make format-check`                    | gofmt and prettier (`make format-fix` applies)              |
| `make lint-check`                      | go vet, eslint and vue-tsc (`make lint-fix` applies)        |
| `make check`                           | format-check and lint-check (no tests)                      |
| `make build`                           | Build the frontend and the three binaries to `bin/`         |
| `make migrate-up`                      | Apply pending migrations                                    |
| `make migrate-down`                    | Roll back the last migration                                |
| `make new-migration`                   | Create a new migration (`NAME=add_something`)               |

# Run

## Run as a container

Requirements: [Docker](https://docs.docker.com/engine/install/) or
[Podman](https://podman.io/docs/installation) (replace `docker` command with
`podman`)

1. Create `.env` file (use the one from this [repository](.env.example)) and
   set `BACKUP_ENCRYPTION_KEY` and `AI_ENCRYPTION_KEY` to secrets of your
   own; the server does not start without them
2. Run `docker run -p 8000:8000 --env-file ./.env arekxv/note-me-go`

By default application will be on `http://localhost:8000`.

On first run, administrator user will be created with username `admin` and
password `admin`; the password must be changed at the first login and the
credentials are not written to the log.

## Run with Docker Compose

For a production server setup behind an HTTPS reverse proxy, an example compose
file is provided in [docker-compose.example.yml](docker-compose.example.yml).

1. Copy `docker-compose.example.yml` to `docker-compose.yml` on your server.
2. Replace `noteme.example.com` with your own domain in `APP_URL`.
3. Run `docker compose up -d`

The compose setup persists the SQLite database in the `./data` directory and
uploaded files in `./files`, and mounts `./backup` into the container as the
root of the "local" backup targets (`LOCAL_BACKUP_ROOT_LOCATION`), so a local
target with the location `nightly` stores its backups in `./backup/nightly` on
the host. The port is bound to `127.0.0.1` so the application is only
reachable through the reverse proxy.

## Reverse proxy

The application serves everything, including the websocket on `/ws`, from port
`8000`. The reverse proxy must forward the websocket upgrade headers for
`/ws`. Example nginx configuration:

```nginx
location / {
    proxy_pass http://localhost:8000;
    proxy_buffering off;
    # Application allows uploads up to 50MB by default.
    client_max_body_size 50m;
}

location /ws {
    proxy_pass http://localhost:8000;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # Keep idle websocket connections alive.
    proxy_read_timeout 1h;
}
```

# Run manually

Requirements: a build of the binary (see [Building](#building)) or Go 1.27 and
Node.js 24 to build it yourself.

1. Set environment variables (see [.env.example](.env.example)); the binary
   loads `.env` and `.env.defaults` from the working directory when present.
   `BACKUP_ENCRYPTION_KEY` and `AI_ENCRYPTION_KEY` are required
2. Run `./bin/noteme`

By default application will be on `http://localhost:8000`.

On first run, administrator user will be created with username `admin` and
password `admin`; the password must be changed at the first login.

## Configuration

All settings are read from environment variables (or `.env` / `.env.defaults`
in the working directory). Variables that are already set in the environment
always win.

| Variable                   | Default                    | Description                                                                                                           |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_DSN`             | `sqlite://:memory:`        | Database as `<type>://<dsn>`: `sqlite://database.sqlite`, `postgres://user:pass@host/db`, `mysql://user:pass@host/db` |
| `COOKIE_SECURE`            | `1`                        | Require secure cookies, set to `0` when not using HTTPS                                                               |
| `COOKIE_MAX_AGE_SECONDS`   | `2592000`                  | Session cookie lifetime (30 days)                                                                                     |
| `SERVER_ADDRESS`           | `127.0.0.1`                | Address the webserver binds to                                                                                        |
| `WEBSERVER_PORT`           | `8000`                     | Webserver port                                                                                                        |
| `LOGGING_LEVEL`            | `INFO`                     | `DEBUG`, `INFO`, `WARN` or `ERROR`                                                                                    |
| `SHOW_LOG_COLORS`          | `1`                        | Colorize log output                                                                                                   |
| `MAX_FILE_SIZE`            | `52428800`                 | Maximum upload size in bytes (50MB)                                                                                   |
| `MAX_USER_STORAGE_SIZE`    | `0`                        | Maximum total size of one user's uploaded files in bytes, `0` means unlimited                                         |
| `MAX_ALLOWED_BACKUP_COUNT` | `5`                        | Automatic backups to keep per target, `0` disables backups                                                            |
| `BACKUP_ENCRYPTION_KEY`    | none, required             | Secret that encrypts every backup; a backup can only be restored with the key that made it                           |
| `AI_ENCRYPTION_KEY`        | none, required             | Secret that encrypts AI provider API keys; when it changes, each provider's key must be entered again                |
| `LOCAL_BACKUP_ROOT_LOCATION` | `backup` next to the binary | Root folder of every "local" backup target; a target's location is a folder inside it, never an absolute path     |
| `APP_URL`                  | `http://localhost:8000`    | Public application URL (`http://` or `https://` and a host); passkeys need a domain name, not an IP address           |
| `FILES_LOCATION`           | `files` next to the binary | Folder for uploaded files; relative paths resolve against the working directory                                       |
| `TRUSTED_PROXIES`          | none                       | Reverse proxies (addresses or CIDR ranges, comma separated) whose `X-Forwarded-For` is used for the login rate limit  |
| `MAX_PASSWORD_ATTEMPTS`    | `10`                       | Wrong passwords a signed in user may enter (protected notes, password change, passkeys, export) before those checks lock for 24 hours |
| `MAX_CONNECTIONS_PER_USER` | `0`                        | Maximum open websocket connections (browser tabs) per user, `0` means unlimited                                       |
| `PERIODIC_TASK_HISTORY_DAYS` | `30`                     | Days of periodic task runs kept and listed in Settings > Tasks                                                       |

A value that cannot be parsed stops the server with an error instead of
falling back to the default.

# Building

## Build using Make

Requirements: Go 1.27, Node.js 24, `make`

1. Run `make build`
2. The server binary is in `bin/noteme`; run it with `./bin/noteme`.
   Maintenance commands are in `bin/noteme-cli`.

## Maintenance commands

| Command                                                | Description                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `noteme-cli migrate-up`                                | Apply pending migrations (creates `admin` on first run)                                 |
| `noteme-cli migrate-down`                              | Roll back the last migration                                                            |
| `noteme-cli new-migration <name>`                      | Create a new migration file pair for every database driver                              |
| `noteme-cli add-user <name> <username>`                | Add an administrator who must change the password on first login; the password is read from stdin |
| `noteme-cli restore-backup [--overwrite] <backup.zip>` | Restore a backup (database and uploaded files); stop the server first                   |
| `noteme-cli healthcheck`                               | Exit 0 when the local server answers `/api/health` (used by the container health check) |
| `noteme-cli version`                                   | Print version information                                                               |

## Backups and restore

Backups are configured in Settings → Backups (a folder inside
`LOCAL_BACKUP_ROOT_LOCATION` or AWS S3) and run every night at midnight UTC;
`MAX_ALLOWED_BACKUP_COUNT` limits how many automatic backups each target
keeps. Each backup is one ZIP file with the database and all uploaded files,
encrypted with `BACKUP_ENCRYPTION_KEY` (`.zip.enc`). Sessions are never part
of a backup, so everyone signs in again after a restore. Keep the key safe: a
backup cannot be restored without the key that encrypted it.

To restore one, download it from Settings → Backups, stop NoteMe and run
`noteme-cli restore-backup --overwrite <backup.zip.enc>` with the same
`DATABASE_DSN`, `FILES_LOCATION` and `BACKUP_ENCRYPTION_KEY` as the server
(in Docker, run it in a container with the same volumes), then start NoteMe
again.

The database in a backup is always a SQLite file, whichever database made
it, so a backup restores into SQLite, PostgreSQL or MySQL. Restoring into
PostgreSQL or MySQL replaces every row of the configured database; this is
also how to move from one database to another.

## Upgrading from NoteMe v1

Stop NoteMe v1, back up its database and run `noteme-upgrade` with
`DATABASE_DSN` pointing at it and `FILES_LOCATION` set to the folder for
uploaded files. It moves uploaded files out of the database into
`FILES_LOCATION`, brings the database to the current structure and
re-encrypts protected notes into the new format. Passkeys cannot be carried
over and are removed; users register them again under Profile → Passkeys.

Password hashes and protected notes can only be converted with each user's
password, so the upgrade asks for every user's password (the input is
visible; leave it empty to skip a user). A skipped user can no longer sign
in until an administrator sets a new password for them in Settings → Users,
and their protected notes are lost with the old password. Users that were
deleted in v1 are removed together with their data. Running the upgrade
again is safe. NoteMe refuses to start on a database that still needs the
upgrade.

Administrators can see security events (sign-ins, lockouts, password
changes, user and backup management) under Settings → Audit log, kept for a
year, and the server's recent log lines under Settings → Server log.

## Build using Docker

Requirements: [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Run `make docker-build`
2. After docker image is built run
   `docker run -p 8000:8000 --env-file ./.env arekxv/note-me-go:<VERSION>`,
   replace `<VERSION>` with the version you see from the output of the build

## Build using Podman

Requirements: [Podman](https://podman.io/docs/installation)

Steps:

1. Run `make podman-build`
2. After image is built run
   `podman run -p 8000:8000 --env-file ./.env localhost/arekxv/note-me-go`

# License

Copyright 2024 Aleksandar Panic

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
