# NoteMe

NoteMe is a simple, note-taking app with powerful features which help you to
keep the ownership of your notes and keep them organized however you see fit.

<p>
  <img src=".github/screenshot-1.jpg" alt="Sign in page" width="49%" />
  <img src=".github/screenshot-2.jpg" alt="Dashboard with recent notes, reminders and notes shared with you" width="49%" />
  <img src=".github/screenshot-3.jpg" alt="Note with a Mermaid diagram and a table, next to an AI assistant conversation" width="49%" />
  <img src=".github/screenshot-4.jpg" alt="Rich text editor with the formatting toolbar" width="49%" />
</p>

## Features

### Writing

- **Rich text or markdown, your choice**. Write in a rich text editor with a
  formatting toolbar, switch to the markdown source editor with syntax
  highlighting, or preview the result, all on the same note. Notes are always
  stored as plain markdown, and each user picks which editor opens first.
- **Markdown with extras**. Everything standard markdown has, plus task lists,
  tables, footnotes and highlighted code blocks. NoteMe adds its own blocks: a
  live table of contents, links to other notes, a list of the notes in a
  folder, aligned images and audio and video players.
- **Mermaid diagrams**. Code blocks marked with the `mermaid` language are
  drawn as [Mermaid](https://mermaid.js.org/) diagrams, so flowcharts,
  sequence diagrams, timelines and more live right in your notes.
- **History of changes**. Every saved change is kept as a version. Compare
  any version with the current note line by line and restore it with one
  click.
- **Files in your notes**. Upload any file and show it in a note as an image
  or a player, or make it downloadable. Browse files in a grid or a list and
  mark each one private or public.

### Organizing

- **Folders and tags**. Put notes in folders and subfolders, rearrange them
  by drag and drop, and tag them however you like.
- **Search**. Find notes by title and content, narrowed down to a folder or a
  set of tags.
- **Dashboard**. See recently opened notes, upcoming and passed reminders and
  notes others shared with you as soon as you sign in.
- **Reminders**. Set one-time or recurring reminders on your own notes or the
  ones shared with you and get a notification when they are due.
- **Recycle bin**. Deleted notes stay in the recycle bin for 30 days, so you
  can restore them or delete them for good.

### Working together

- **Multiple users**. Every user has their own notes and folders. Roles
  decide who can manage users, files, backups and server settings.
- **Sharing**. Share a note with other users, or with anyone through a public
  link that can expire.
- **Live updates**. Changes show up immediately in every open tab and for
  everyone a note is shared with, without reloading.

### AI

- **AI assistant**. Administrators connect Ollama, OpenAI (or any compatible
  server) or Claude, and users chat with an assistant that searches, reads,
  writes and organizes their notes, folders, reminders and shares with the
  user's own permissions. Actions that cannot be undone wait for the user to
  allow them, and protected notes are only read after the user agrees.
- **MCP server**. Connect your own AI tool, such as Claude, ChatGPT or Cursor,
  to your notes over the Model Context Protocol with a personal token or
  OAuth. Each connection can be limited to read only access.

### Security and privacy

- **Protected notes**. Protect a note with your password and it is encrypted
  in the database, so nobody but you can read it: not other users, not
  administrators and not anyone with direct access to the database.
- **Passkeys**. Sign in with a passkey instead of a password.
- **Hardened sign in**. Passwords are hashed with Argon2id, repeated failed
  sign ins are rate limited, and administrators can review security events in
  the audit log.
- **Encrypted backups**. Nightly backups go to a folder on the server or to
  AWS S3, to as many targets as you like, and every backup is encrypted.
- **Your data, portable**. Import existing markdown or text files as notes,
  or export all of your notes and files as one ZIP archive.

### Hosting

- **Easily hostable**. NoteMe is a single static binary with no runtime
  dependencies that runs on Linux, macOS and Windows, or a ready-made
  container image. Keep your data in SQLite, PostgreSQL or MySQL, and move
  between them by restoring a backup.
- **Installable app**. Add NoteMe to your phone's home screen or your desktop
  as a progressive web app.
- **Built-in help**. Help pages and first-time introductions explain every
  part of the app, including the administrator settings.

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
2. Run `docker run -p 8000:8000 --env-file ./.env arekxv/note-me`

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

# Upgrading from NoteMe v1

NoteMe v2 is a rewrite in Go. Existing v1 data comes along, but the database
must be converted once with `noteme-upgrade`, which asks for each user's
password, and a few settings and the reverse proxy setup change. Follow the
step by step guide in [docs/upgrading-from-v1.md](docs/upgrading-from-v1.md).

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

## Audit log and server log

Administrators can see security events (sign-ins, lockouts, password
changes, user and backup management) under Settings → Audit log, kept for a
year, and the server's recent log lines under Settings → Server log.

## Build using Docker

Requirements: [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Run `make docker-build`
2. After docker image is built run
   `docker run -p 8000:8000 --env-file ./.env arekxv/note-me:<VERSION>`,
   replace `<VERSION>` with the version you see from the output of the build

## Build using Podman

Requirements: [Podman](https://podman.io/docs/installation)

Steps:

1. Run `make podman-build`
2. After image is built run
   `podman run -p 8000:8000 --env-file ./.env localhost/arekxv/note-me`

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
