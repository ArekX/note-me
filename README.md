# Note Me

NoteMe is a self-hosted powerful note-taking app designed for enhanced
productivity. It includes features like note history, reminders, and support for
multiple users as well as note tagging and adding attachments.

# Development

Requirements:

- [Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Copy the environment example file: `cp env.example .env`
2. Run migrations: `deno task cli migrate-up`
3. Add a demo user: `deno task cli add-user "Demo user" demo demo`
4. Install git hooks by running `setup-githooks.sh`
5. Start the development server: `deno task dev`

You should be log in with `demo` as username and password.

# Run

**Important:** Environment file `.env` is required to properly run the
containers. See [example.env](example.env) for details.

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

1. Set environment variables (see env.example)
2. Add DENO_DEPLOYMENT_ID environment variable. Should be
   `export DENO_DEPLOYMENT_ID=$(git rev-parse HEAD)`
3. Run `deno task cache` to pre-install all dependencies.
4. Run `deno task production`

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
