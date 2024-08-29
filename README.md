# NoteMe

NoteMe is a simple, note-taking app with powerful features which help you to
keep the ownership of your notes and keep them organized however you see fit.

## Features

- **Markdown support**. Notes are written and shown using markdown. All standard
  markdown syntax is supported with additional flavors like task lists,
  footnotes, tables and extensions special to NoteMe like showing dynamic table
  of contents, note links and listing notes from a specific group.
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
- **Recycled Notes**. Deleted notes are kept in recycle bin for 30 days and can
  be retrieved by you at any time or fully deleted.
- **Easily hostable**. NoteMe can easily be run on any system running Deno with
  minimal configuration, or you can run it as a docker container using one of
  the prebuilt container images.

# Development and Contributing

Requirements:
[Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Copy the environment example file: `cp .env.example .env` to override
   defaults. This is optional as `.env.defaults` will be loaded if this step is
   omitted.
2. Install git hooks by running `setup-githooks.sh` to setup git hooks.
3. Start the development server: `deno task dev`

By default application will be on `http://localhost:8000` with additional
backend websocket connection at `http://localhost:8080`.

On first run, administrator user will be created with username `admin` and
password `admin`.

# Run

## Run as a container

Requirements: [Docker](https://docs.docker.com/engine/install/) or
[Podman](https://podman.io/docs/installation) (replace `docker` command with
`podman`)

1. Create `.env` file (use the one from this [repository](.env.example) or
   follow instructions on [DockerHub](https://hub.docker.com/r/arekxv/note-me))
2. Run `docker run -p 8000:8000 -p 8080:8080 --env-file ./.env arekxv/note-me`

By default application will be on `http://localhost:8000` with additional
backend websocket connection at `http://localhost:8080`.

On first run, administrator user will be created with username `admin` and
password `admin`.

# Run manually

Requirements:
[Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Set environment variables (see [.env.example](.env.example))
2. Add DENO_DEPLOYMENT_ID environment variable. Should be
   `export DENO_DEPLOYMENT_ID=$(git rev-parse HEAD)`
3. Run `deno task cache` to pre-install all dependencies. This is optional but
   will speedup first-time run.
4. Run `deno task build-assets` to build assets needed for the application.
5. Run `deno task production` to start the main application.

By default application will be on `http://localhost:8000` with additional
backend websocket connection at `http://localhost:8080`.

On first run, administrator user will be created with username `admin` and
password `admin`.

# Building

## Build using Docker

Requirements: [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Run `deno task build-docker`
2. After docker image is built run
   `docker run -p 8000:8000 -p 8080:8080 --env-file ./.env arekxv/note-me:<VERSION>`,
   replace `<VERSION>` with the version you see from the output of the build

## Build using Podman

Requirements: [Podman](https://podman.io/docs/installation)

Steps:

1. Run `deno task build-podman`
2. After image is built run
   `podman run -p 8000:8000 -p 8080:8080 --env-file ./.env localhost/arekxv/note-me`

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
