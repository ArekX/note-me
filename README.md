# Note Me

NoteMe is a simple, note-taking app with powerful features which help to keep
the ownership of your notes and keep them organized however you see fit.

## Features

- **Markdown support**. Notes are written and shown using markdown. All standard
  markdown syntax is supported with additional flavors like task lists,
  footnotes, tables and extensions special to NoteMe like showing dynamic table
  of contents, note links and listing notes from a specific group.
- **Organize your notes**. You can tag your notes, store them in any kind of
  groups or subgroups making it easy to create an exact structure you want.
- **Multiple users welcome**. NoteMe support any amount of users with different
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
- **Recycled Notes**. Deleted notes are kept in recycle bin for 30 days and can
  be retrieved by you at any time or fully deleted.
- **Easily hostable**. NoteMe can easily be run on any system running Deno with
  minimal configuration, or you can run it as a docker container using one of
  the prebuilt images.

# Development

Requirements:

- [Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. (Optional) Copy the environment example file: `cp .env.example .env` to
   override defaults.
2. Install git hooks by running `setup-githooks.sh`
3. Start the development server: `deno task dev`

First time login is with `admin` as both username and password.

# Run

**Important:** Environment file `.env` is required to properly run the
containers. See [.env.example](.env.example) for details.

On first run, database will be created with an administrator username `admin`
and password `admin`.

## via Docker

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

1. Find version you want to run at
   [DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
2. Run
   `docker run -p 8000:8000 -p 8080:8080 --env-file ./.env arekxv/note-me:<VERSION>`,
   replace `<VERSION>` with the version.

Application will be on `http://localhost:8000`. Additional WebSocket interface
(for notifications and communication) will be used at `http://localhost:8080`.

## via Podman

Requirements:

- [Podman](https://podman.io/docs/installation)

Use same instruction as for Docker, but use `podman run` instead of
`docker run`.

# Build and run manually

Requirements:

- [Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Set environment variables (see .env.example)
2. Add DENO_DEPLOYMENT_ID environment variable. Should be
   `export DENO_DEPLOYMENT_ID=$(git rev-parse HEAD)`
3. Run `deno task cache` to pre-install all dependencies.
4. RUN `deno task build-assets` to build islands and other assets.
5. Run `deno task production`

# Build and run using Docker

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Tag a release with `git tag <VERSION>` or fetch tags via `git fetch --tags`
2. Run `deno task build-docker`
3. After docker image is built run
   `docker run -p 8000:8000 -p 8080:8080 --env-file ./.env arekxv/note-me:<VERSION>`,
   replace `<VERSION>` with the version.

Or see
[pre-built versions on DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
and download that by just doing step 3.

# Build and run using Podman

Requirements:

- [Podman](https://podman.io/docs/installation)

Steps:

1. Tag a release with `git tag <VERSION>` or fetch tags via `git fetch --tags`
2. Run `deno task build-podman`
3. After image is built run
   `podman run -p 8000:8000 -p 8080:8080 --env-file ./.env localhost/arekxv/note-me`
