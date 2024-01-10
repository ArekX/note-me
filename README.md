# Note Me

NoteMe is a self-hosted powerful note-taking app designed for enhanced
productivity. It includes features like note history, reminders, and support for
multiple users as well as note tagging and adding attachments.

# V1 TODO

- [x] Login
- [x] Note creation with tags and groups
- [ ] Group management
- [ ] User profile management
- [ ] Backup
- [ ] Tags management
- [ ] Note reminders
- [ ] Share notes?

# Development

Requirements:

- [Deno 1.39.2](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Copy the environment example file: `cp env.example .env`
2. Run migrations: `deno task cli migrate-up`
3. Add a demo user: `deno task cli add-user "Demo user" demo demo`
4. Start the development server: `deno task dev`

Then log in with `demo` as username and password.

# Build

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

Steps:

1. Tag a release with `git tag <VERSION>`.
2. Run `deno task build`
3. After docker image is built run
   `docker run -p 8000:8000 -p 8080:8080 arekxv/note-me:<VERSION>`

Or see
[pre-built versions on DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
and download that by just doing step 3.

# Run (using Docker)

Requirements:

- [Docker](https://docs.docker.com/engine/install/)

1. Build the application (see above) or
   [download prebuilt versions from DockerHub](https://hub.docker.com/repository/docker/arekxv/note-me/general)
2. Run `docker run -p 8000:8000 -p 8080:8080 arekxv/note-me:<VERSION>`

Application will be on `http://localhost:8000`. Additional WebSocket interface
(for notifications and communication) will be used at `http://localhost:8080`.

# Run (without Docker)

Requirements:

- [Deno 1.39.1](https://docs.deno.com/runtime/manual/getting_started/installation)

1. Set environment variables (see env.example)
2. Add DENO_DEPLOYMENT_ID environment variable. Should be
   `export DENO_DEPLOYMENT_ID=$(git rev-parse HEAD)`
3. Run `deno task cache` to pre-install all dependencies.
4. Run migrations `deno task cli migrate-up`
5. Run `deno task cli add-user "Administrator" admin admin` to create a login
   for yourself.
6. Run `deno task production`
