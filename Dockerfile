# ---------------------------------------------------------------------------
# Stage 1: build the Vue frontend
# ---------------------------------------------------------------------------
FROM node:24-alpine AS frontend

WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: build the Go binaries with the frontend embedded
# ---------------------------------------------------------------------------
FROM golang:1.27.2-alpine AS backend

ARG BUILD_ID=dev
ARG VERSION=dev

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
COPY --from=frontend /src/frontend/dist ./frontend/dist

# The database drivers (modernc.org/sqlite, pgx, go-sql-driver/mysql) are
# pure Go, so the binary is fully static and can run in a distroless image.
RUN for cmd in noteme noteme-cli noteme-upgrade; do \
        CGO_ENABLED=0 GOOS=linux go build \
            -trimpath \
            -ldflags="-s -w -X noteme/internal/version.Version=${VERSION} -X noteme/internal/version.BuildID=${BUILD_ID}" \
            -o /out/$cmd ./cmd/$cmd || exit 1; \
    done

# The runtime image has no shell, so the folders the server writes to are
# made here and copied in owned by nonroot (/app itself belongs to root).
RUN mkdir -p /out/app/data /out/app/backup /out/app/files /out/app/temp

# ---------------------------------------------------------------------------
# Stage 3: minimal runtime image
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

ARG BUILD_ID=dev
ENV BUILD_ID=${BUILD_ID}

WORKDIR /app

COPY --from=backend --chown=nonroot:nonroot /out/noteme /out/noteme-cli /out/noteme-upgrade /app/
COPY --from=backend --chown=nonroot:nonroot /out/app/ /app/

# Database, uploaded files and local backups live under /app by default;
# unfinished uploads stay in /app/temp inside the container.
VOLUME ["/app/data", "/app/backup", "/app/files"]

EXPOSE 8000

STOPSIGNAL SIGINT

ENTRYPOINT ["/app/noteme"]
