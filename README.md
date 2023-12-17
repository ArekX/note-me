# Note Taking App

# Requirements

Deno 1.39.0

# Start

```
cp env.example .env
deno task cli migrate-up
deno task cli add-user "Demo user" demo demo
deno task dev
```

# Build

Requirements:

- Docker

Steps:

1. Tag a release with `git tag`.
2. Run `deno task build`
