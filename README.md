# Note Taking App

Requirements:

- [Deno 1.39.1](https://docs.deno.com/runtime/manual/getting_started/installation)

# Start

```
cp env.example .env
deno task cli migrate-up
deno task cli add-user "Demo user" demo demo
deno task dev
```

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
3. Run migrations `deno task cli migrate-up`
4. Run `deno task cli add-user "Administrator" admin admin` to create a login
   for yourself.
5. Run `deno task production`
