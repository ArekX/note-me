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

## via Docker

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

1. Find version you want to run at
   [DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
2. Run `docker run -p 8000:8000 -p 8080:8080 arekxv/note-me:<VERSION>`, replace
   `<VERSION>` with the version.

Application will be on `http://localhost:8000`. Additional WebSocket interface
(for notifications and communication) will be used at `http://localhost:8080`.

## via Podman

Requirements:

- [Podman](https://podman.io/docs/installation)

Use same instruction as for Docker, but use `podman run` instead of
`docker run`.

# Build and Run

Requirements:

- [Deno](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Set environment variables (see env.example)
2. Add DENO_DEPLOYMENT_ID environment variable. Should be
   `export DENO_DEPLOYMENT_ID=$(git rev-parse HEAD)`
3. Run `deno task cache` to pre-install all dependencies.
4. Run migrations `deno task cli migrate-up`
5. Run `deno task cli add-user "Administrator" admin admin` to create a login
   for yourself.
6. Run `deno task production`

# Build and run using Docker

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Tag a release with `git tag <VERSION>`.
2. Run `deno task build-docker`
3. After docker image is built run
   `docker run -p 8000:8000 -p 8080:8080 arekxv/note-me:<VERSION>`

Or see
[pre-built versions on DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
and download that by just doing step 3.

# Build and run using Podman

Requirements:

- [Podman](https://podman.io/docs/installation)

Steps:

1. Run `deno task build-podman`
2. After image is built run
   `podman run -p 8000:8000 -p 8080:8080 localhost/arekxv/note-me`
