# NoteMe (Go) — project guide

Go rewrite of the Deno app in `../note-me`. Single static binary: Go 1.27
backend with the Vue 3 frontend embedded from `frontend/dist`.

## Rules

### Comments

- Backend and frontend (Go, TypeScript, Vue, CSS, tests included): a
  comment stays only if reading the code would not tell you what is
  happening or why. Allowed: a non-obvious reason, a constraint imposed
  from outside (library or driver behaviour, container image, OS, external
  data format, protocol or enum values carried in plain strings), a security
  invariant, a magic number, the source of test vectors or expected values.
  Everything else goes, including comments that describe what the next lines
  do, repeat an assertion, or restate a decision the code already makes
  obvious (decisions 0.25, 0.29). Keep the remaining ones as
  short as the reason allows.
- No package docs, no doc comments (Go doc or JSDoc) on exported
  identifiers, no comments that restate the name or signature, no "mirrors
  file X of the original" notes.
- `TODO:` markers are fine for scaffolded behaviour; keep them to one line.
- Keep the `//` separator line gofmt wants between a comment and `//go:embed`.

### Backend

- Keep it bare. Do not add packages, abstractions, interfaces or helpers ahead
  of a concrete need; the architecture is still being decided.
- Standard library first: `net/http` with `http.ServeMux` patterns, `log/slog`,
  `database/sql`, `flag`, `crypto/*`, `archive/zip`. Approved third-party
  modules: `modernc.org/sqlite` (pure Go, keeps `CGO_ENABLED=0`),
  `github.com/coder/websocket`, `github.com/joho/godotenv` (.env files),
  `golang.org/x/crypto` (`argon2` and `chacha20poly1305` for passwords, note
  encryption and backups; `bcrypt` only inside `cmd/noteme-upgrade`, which
  converts old hashes), `github.com/go-webauthn/webauthn`
  (passkeys), `github.com/aws/aws-sdk-go-v2` (`aws`, `config`,
  `credentials`, `service/s3`, `feature/s3/manager`) for the S3 backup
  target, `github.com/jackc/pgx/v5` (through `stdlib`) and
  `github.com/go-sql-driver/mysql` for PostgreSQL and MySQL (both pure Go),
  and `github.com/modelcontextprotocol/go-sdk` (`mcp`, `auth`, `oauthex`)
  with its dependencies for the MCP server (decision 0.84).
  Ask before adding anything else.
- The HTTP server (`internal/http`) also serves the websocket on `/ws`
  (`internal/http/websocket`); `internal/app` starts it and gets the hub
  from `internal/http/websocket/api.NewHub`, which creates the
  `websocket.Hub` and passes every namespace to
  `hub.RegisterNamespaces(tree.New(c), groups.New(c), ...)`. Every
  namespace is its own package under `internal/http/websocket/handlers/<ns>`
  with a `Namespace` type whose `Register` lists its routes with
  `hub.Handle(ns, type, fn)`; namespaces do not import each other, and the
  shared websocket test server is `handlers/handlerstest` (decision 0.41).
  Handlers push with `hub.SendToUser` (backend messages with
  `hub.HandleBackend` / `hub.PushBackend`). A handler that changes data
  answers with `req.RespondToUser` and tells other affected users with
  `changes/dataChanged` (`hub.SendToUsers`, `SendToPermission`,
  `SendToEveryone`; workers through `changes/notifyDataChanged`, decision
  0.85). Handlers reach the browser with an
  error message only through
  `websocket.NewClientError` or `validation.Issues`. Any change to a user's
  session data goes through `hub.RefreshUserSession` (decisions 0.27, 0.28). Workers
  (`internal/workers`) are background goroutines under a supervisor; there is
  no database worker. Workers reach the websocket only through the event bus
  (`internal/eventbus`, `components.Bus`): they `bus.Publish` a typed
  event from `eventbus/events.go`, and the owning namespace's `Register` calls
  `bus.Subscribe` and turns it into `hub.PushBackend` (decision 0.40).
  Handlers start background jobs through `components.Jobs` (`Enqueue`,
  `Abort`), which the job processor worker drains (decision 0.53). Database access happens
  directly where it is needed. Security events go through
  `components.Audit.Record` (decision 0.74); a signed in user's password
  checks go through `components.PasswordGuard` (decision 0.71).
- The AI assistant's tools live only in `internal/http/aitools`: each tool's
  argument struct gives its schema and validation, `Prepare` builds the
  websocket message the browser sends as the user, and `Result` trims the
  response. The assistant's tools run in the browser (decision 0.83). MCP
  clients (`/mcp`, `internal/http/mcp`, OAuth in `internal/http/oauth`) get
  the same catalog run on the server by `aitools.Runner` through
  `hub.Call`, which dispatches a message as the user without a connection;
  browser tools, protected note text and, for read only clients, tools
  without `ReadOnly` are never available there (decision 0.84).
- Environment variables are defined by `.env.defaults`, `.env.example` and
  `internal/config`; those are the source of truth, not the original app. Known
  differences: `DATABASE_DSN` replaces `SQLITE_DATABASE_LOCATION` and
  takes `sqlite://`, `postgres://` (or `postgresql://`) and `mysql://`; the
  websocket shares the webserver port, so `WEBSOCKET_PORT` and
  `SOCKET_HOSTNAME` are gone; `COOKIE_DOMAIN` is gone (host-only session
  cookie, decision 0.63); `RUN_MIGRATIONS_ON_STARTUP`,
  `DISABLE_SERVICE_PERIODIC_TASKS` and `ALLOWED_SERVICE_RETRIES` do not exist;
  the backup limit is `MAX_ALLOWED_BACKUP_COUNT`; `FILES_LOCATION` is new
  (uploaded files folder, default `<exe dir>/files`, `files` in
  `.env.defaults` for development, relative paths resolve against the working
  directory; the database holds only file metadata, decision 0.57);
  `TRUSTED_PROXIES` is new (proxies whose
  `X-Forwarded-For` is trusted for the login rate limit);
  `BACKUP_ENCRYPTION_KEY` (required, encrypts every backup),
  `AI_ENCRYPTION_KEY` (required, encrypts AI provider API keys, decision
  0.83),
  `LOCAL_BACKUP_ROOT_LOCATION` (root of local backup targets),
  `MAX_USER_STORAGE_SIZE`, `MAX_PASSWORD_ATTEMPTS` and
  `MAX_CONNECTIONS_PER_USER` are new (decisions 0.70 to 0.75), as is
  `PERIODIC_TASK_HISTORY_DAYS` (days of task runs kept, decision 0.78). Booleans use
  `"1"`; an unparsable value is an error, not a fallback.
- Migrations are plain SQL pairs in each driver's `migrations` folder
  (`internal/components/database/drivers/{sqlite,postgres,mysql}/migrations`,
  `<timestamp>_<name>.up.sql` / `.down.sql`), embedded at build time. Every
  migration exists in all three folders under the same name and builds the
  same tables, columns, unique columns, foreign keys and named indexes
  (`databasetest.TestSchemaMatchesSqlite` checks it). Keep SQLite column
  types as kysely generated them so original databases stay compatible.
  MySQL statements end with `;` at the end of a line (they run one by one).
  After the v2 release, new ones come from `make new-migration NAME=...`,
  which writes to every driver's folder.
- v2 has one migration, `20231216_162457_initdb`, with the whole schema
  (decision 0.61). Until v2 is released, a table structure change edits it in
  place for every driver and extends `cmd/noteme-upgrade`, which converts an original Deno
  database (kysely migration table, file blobs extracted to
  `FILES_LOCATION`, old passkeys removed, duplicates removed before the
  unique indexes, soft-deleted users removed, bcrypt hashes converted with
  each user's password, added columns such as `note.is_wide` filled for
  existing rows) or an earlier Go database into
  exactly that structure; its test compares the upgraded schema with a fresh
  one. The upgrade only works on sqlite and must stay safe to run twice. The
  app migrates on start and refuses a database that still needs the upgrade.
- Layers, bottom to top: leaf packages (`config`, `logger`, `version`,
  `timezone`, `encryption`, `eventbus`) → `components` (database, repository) → `http`, `workers` →
  `app` → `cmd`. A package imports only from its own layer or below; never
  upward or sideways into another layer's types (the repository must not
  import `internal/http/...`). Each layer keeps its own types (e.g.
  `repository.Paged` vs `messages.Paged`) and the upper layer converts.
- `repository.Repository` is an interface with `RunInTransaction` and one
  accessor per namespace (`repo.Notes().GetNote(...)`); each namespace
  interface (`repository.Notes`, `Groups`, `Tags`, ...) sits in its domain
  file with its record types and errors. A new repository method goes into
  its namespace interface. One implementation serves every database:
  `database/sqlrepo` (`sqlrepo.New(db, databaseType)`), written with `?`
  placeholders (the postgres driver rewrites them to `$n`) and SQL that runs
  on SQLite, PostgreSQL and MySQL; the few differences are fields of its
  `dialect`. A row that may already exist is inserted with
  `r.insertIfAbsent`, never after a check (decision 0.76). Drivers (`drivers/sqlite`, `postgres`, `mysql`) only hold the
  connection, the migrations and the migration driver. `database.Open` picks
  the driver from `DATABASE_DSN` and returns the DB, repository and migrator.
  The migrator (`migrate`) talks to the driver through `migrate.Driver`
  (`drivers.Migrations`, wrapped by `sqlite.NewMigrations` for the upgrade
  check) (decisions 0.62, 0.69).
- Repository methods query through `r.q` (DB or Tx), never `r.db`.
  Transactions only via `repo.RunInTransaction(ctx, func(tx repository.Repository) error)`
  (inside `sqlrepo` `r.runInTransaction` with `*Repository`):
  inside fn use only `tx` (the single sqlite connection deadlocks on the outer
  repo), keep fn to database work and push websocket messages after it
  returns. Nested calls join the outer transaction.
- The backend always runs in UTC: every binary sets `time.Local = time.UTC`
  first, and server-side time math uses UTC. User timezones only affect what
  is shown or scheduled per user (decision 0.24).
- Every backend solution must be cross-platform (Linux, macOS, Windows); give
  OS-specific behaviour a portable fallback (decision 0.22).
- Note encryption is format v2 only (`internal/encryption`, decision 0.14);
  the old Deno format exists only in `cmd/noteme-upgrade`. Passwords are
  Argon2id PHC strings (`encryption.HashPassword` / `VerifyPassword`,
  decision 0.71); users are deleted for good, never soft deleted (decision
  0.72); backups are encrypted with `encryption.EncryptFile` (decision 0.73).
- Request validation uses `internal/http/validation` (strict, zod-shaped
  issues, decision 0.16). Optional fields carry `omitempty`/`omitzero`,
  nullable ones `zod:"nullable"`, zod's `{error}` message goes in an
  `error:"..."` tag; `messages.Optional[T]` tells an absent key from `null`
  (decision 0.33).
- Go 1.27 allows type parameters on methods (`func (b *Bus) Publish[T
  any](...)`); use a generic method instead of a package-level generic
  function that takes the receiver as an argument. Generic methods cannot
  satisfy interfaces.
- Errors: wrap with `fmt.Errorf("context: %w", err)` only where the extra
  context helps; return `error`, never panic for expected failures.
- In HTTP handlers and middleware call `r.Context()` at each use; do not
  store it in a local `ctx` variable.
- CSRF protection is `SameSite=Strict` cookies + `http.CrossOriginProtection`
  + the websocket origin check; there is no CSRF token. That check skips
  GET/HEAD/OPTIONS, so those handlers must never change state.
- Backups hold a SQLite file whatever the database: `VACUUM INTO` on
  SQLite, a row copy into a new SQLite database (`backups/snapshot.go`) on
  PostgreSQL and MySQL; `backups.RestoreInto` copies a backup into any
  migrated database. A new table goes into `snapshotTables` (decision 0.69);
  `session` rows are never backed up and every archive is encrypted
  (decision 0.73).
- Repository, backup and CLI restore tests open their database with
  `databasetest.Open` / `databasetest.DSN`: a sqlite file, or with
  `TEST_DATABASE_DSN` a fresh PostgreSQL schema or MySQL database per test.
  `make test-databases` runs them against both servers from
  `compose.test.yaml`. Every repository query must run in a test.
- Code must be gofmt clean and pass `go vet` and `go test ./... -race`
  (`make format-check`, `make lint-check`, `make test-backend`,
  `make test-databases`).

### Frontend

- Vue 3 `<script setup lang="ts">`, Pinia setup stores, vue-router, Tailwind
  4, boxicons, zod 4, markdown-it (+ markdown-it-footnote) for note rendering,
  CodeMirror 6 (`@codemirror/*`, `@lezer/highlight`) for the source editor,
  Tiptap 3 (`@tiptap/core`, `pm`, `vue-3`, `starter-kit`,
  `extension-code-block`, `extension-code-block-lowlight` (fed by the app's
  highlight.js, no `lowlight` import), `extension-image`, `extension-list`,
  `extension-table`) for the rich editor, which reads markdown through the
  viewer's markdown-it tokens and writes it with its own serializer in
  `src/lib/rich-editor` (no `@tiptap/markdown`, decision 0.86),
  highlight.js for code blocks, mermaid (lazy) for diagrams, `diff` for
  history diffs, `@shopify/draggable` for the sidebar tree (core `Draggable` only; the tree
  store moves nodes, never the library, decision 0.30),
  `@simplewebauthn/browser` for passkeys (only through `src/lib/passkeys.ts`,
  decision 0.50).
  Mermaid runs with `securityLevel: "strict"` and HTML labels off; no
  sanitiser library (decision 0.70, SF-12).
  Pages live in `src/pages` (one per route), global state in `src/stores`,
  request schemas in `src/schemas` (copied from the original; keep their
  validation messages), browser helpers in `src/lib`.
- Reuse the shared pieces before writing markup again: `Button`,
  `IconButton`, `ButtonGroup`, `Badge`, `Callout`, `Input`/`DropdownList`
  (label and validation errors via `FormField`), `Table`, `Pagination`,
  `Dialog`/`ConfirmDialog`, `UserAvatar`, `notes/NoteRow`,
  `sidebar/SidebarList`, `dashboard/DashboardCard`; errors go to the user
  with `toastStore.reportError`, server validation issues with
  `validation.setServerErrors`, paging through `usePagedData`. Keep every
  frontend file under 500 lines (decision 0.68).
- Colours, font and shadows come from the theme tokens in
  `src/assets/styles.css` (`bg-surface`, `text-muted`, `border-line`,
  `bg-accent`, ...; note content styles in `notes.css`); new UI uses them,
  not raw Tailwind greys. The font is self hosted in `public/fonts`
  (decision 0.65).
- PWA: `public/manifest.json`, icons in `public/icons` and the service worker
  `src/service-worker.js`, emitted as `sw.js` by the Vite plugin and
  registered in production only. It must never cache `/api/`, `/file/` or
  `/ws` (decision 0.66).
- Path alias `@` = `src`. Formatting is prettier with 4-space indent; linting
  is ESLint (flat config in `frontend/eslint.config.ts`: vue essential +
  typescript-eslint recommended, formatting rules disabled in favour of
  prettier). Unused variables must be prefixed with `_`.
- `src/lib/rbac.ts` and `src/lib/time-zone.ts` must stay in sync with their
  backend counterparts when those are ported.
- Websocket messages: TypeScript types live in `src/types/messages/<ns>.ts`
  (records in `src/types/records.ts`), Go structs in
  `internal/http/websocket/messages/<ns>.go`. A new or changed message is edited in
  both places. Message `type` strings and JSON field names are the contract;
  keep them identical to the original app.
- Socket layering: `lib/socket/manager.ts` owns the connection (queue,
  heartbeat, reconnect) and talks to a `SocketTransport`; `service.ts` adds
  request/response and `listen(eventMap)`; the `socket` store owns the
  manager and its lifecycle; components use `useWebsocketService()`. Do not
  call `WebSocket` directly anywhere else. Lists follow changes made
  elsewhere with `useDataChanges(sources, reload)` (decision 0.85).
- There is no mock mode; the frontend always talks to the Go server
  (decision 0.67). Vitest runs against a test-only fake backend in
  `src/test/mock-backend` (handlers per namespace, fixtures in `state.ts`),
  which `src/test/setup.ts` installs as the global `WebSocket` and resets
  before every test. Add a handler there only when a test needs it.
- TypeScript stays on 6.x until vue-tsc and typescript-eslint support 7.

### Process

- Decisions live in `decisions/` (index in `decisions/README.md`), one file
  per decision with who made it. Read the relevant ones before working on an
  item and never re-open a recorded decision unasked. Record every new
  decision there, the user's and your own, in the same change that applies
  it, and add it to the index.
- Never implement or change anything until the user says so. Questions,
  explanations and suggestions get answers only, not edits.
- When asked to explain something, answer concisely in plain language. The
  user will ask for more detail if needed.
- Never commit or push unless asked.
- Run `make check test` before reporting work as done. `check` is only
  `format-check` (gofmt, prettier) and `lint-check` (go vet, eslint, vue-tsc);
  tests are separate. Use `make format-fix` and `make lint-fix` for autofixes.
- When porting a feature, read the original implementation in `../note-me`
  first and keep behaviour, names and messages the same unless told otherwise.

## Layout

```
cmd/noteme/           server entrypoint: starts the app, no subcommands
cmd/noteme-cli/       CLI entrypoint: migrate-up, migrate-down, new-migration, add-user, restore-backup, healthcheck, version
cmd/noteme-upgrade/   upgrade of an original (Deno) or earlier Go sqlite database: files, migration table, passkeys, unique indexes, soft-deleted users, bcrypt passwords and note encryption
decisions/            decision records (see Process)
internal/app          wiring: config, logger, db + migrations, http, websocket, workers
internal/config       env loading via godotenv (.env then .env.defaults; process env wins) and typed config
internal/logger       slog
internal/timezone     IANA timezone validation (counterpart of frontend/src/lib/time-zone.ts)
internal/encryption   note key and note encryption, format v2 (Argon2id + XChaCha20-Poly1305)
internal/eventbus     in-process typed events (synchronous); workers publish, websocket handlers subscribe
internal/components   shared container (db, logger + log buffer, config, event bus, storage, passkeys, login guard, password guard, job queue, backups, audit log, AI) passed to services; ai/ holds the AI provider clients (OpenAI, Claude, Ollama) and the API key cache; audit/ records security events; jobs/ is the background job queue; backups/ builds, encrypts and restores backup zips and holds the local (under LOCAL_BACKUP_ROOT_LOCATION) and S3 targets; storage/ holds the temp and uploaded files folders; passkeys/ wraps go-webauthn (+ passkeystest software authenticator); loginguard/ is the login rate limit (by address) and the password attempt lock (by user); repository/ is the repository interface and its record types; database/ holds drivers/ (DB interfaces and the shared migration driver; sqlite/, postgres/ and mysql/ with the connection and SQL files), sqlrepo/ (the repository implementation for every database), databasetest/ (test databases) and migrate/ (driver-independent migrator)
internal/http         net/http: /api/*, /file and the embedded SPA fallback; middleware/, routes/, rbac/ (roles and permissions), validation/ (zod-shaped issues), response/ (JSON and the browser error page redirect), clientip/ (client address behind trusted proxies), aitools/ (the AI tool catalog and its server runner), mcp/ (the /mcp endpoint and bearer tokens), oauth/ (the OAuth authorization server for MCP clients)
internal/http/websocket  /ws handler and message types; handlers/<ns> one package per namespace (+ handlerstest; changes/ sends dataChanged, ai/ runs assistant turns), api/ builds the hub with them
internal/workers      supervisor; periodictask/ (8 scheduled tasks, schedule persisted), jobprocessor/ (runs jobs from components/jobs: create-data-export)
internal/version      build info set via -ldflags -X
frontend/             Vue app; embed.go exposes dist/ to the Go binary
```

## Commands

```
make deps            install Go modules and npm packages
make setup-githooks  git hooks from .githooks (pre-commit: make check = format+lint, pre-push: make test)
make dev             Go server on :8000 + Vite on :5173 (proxies /api, /file and /ws)
make dev-frontend    Vite only, proxying to a Go server already running
make build           frontend build then static binaries bin/noteme, bin/noteme-cli and bin/noteme-upgrade
make test            go test + database tests + vitest
make test-databases  database tests against PostgreSQL and MySQL (docker compose, DOCKER=podman works)
make format-check    gofmt + prettier (format-fix applies)
make lint-check      go vet + eslint + vue-tsc (lint-fix applies autofixes)
make check           format-check + lint-check (no tests; run `make check test` before finishing)
make docker-build    multi-stage image, distroless runtime
make migrate-up / migrate-down / new-migration NAME=x
make upgrade         noteme-upgrade on DATABASE_DSN, or DB=path.sqlite FILES=dir
```

Dev uses `.env` if present, otherwise `.env.defaults`. `SKIP_ENV=1` disables
file loading. The Vite dev server is the entrypoint during development; the Go
binary only serves `frontend/dist` in production.

## Reference

- Original app: `../note-me` (Deno + Fresh + Preact). Its `workers/`,
  `backend/`, `schemas/` and `routes/` folders are the source of truth when
  porting features.
- Original websocket namespaces: notifications, tree, groups, notes, tags,
  users, files, settings.
- Original periodic tasks: check-reminders (every minute), cleanup-temp-folder
  (hourly), remove-expired-share-links, remove-expired-deleted-notes,
  backup-database (daily at midnight, UTC here). Added here:
  remove-expired-sessions (hourly), cleanup-audit-log (daily) and
  remove-expired-mcp-tokens (hourly). Processor job: create-data-export.
- Toolchain is pinned in `.tool-versions` (asdf): Go 1.27.2, Node 24.
