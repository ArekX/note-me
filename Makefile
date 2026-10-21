# NoteMe (Go) — build, test and packaging targets.
#
# The application is shipped as a static server binary (bin/noteme) with the Vue
# frontend from frontend/dist embedded, plus bin/noteme-cli for maintenance
# commands (migrations, version) and bin/noteme-upgrade, which converts a
# database from the original Deno app.

SHELL := /bin/bash

APP_NAME      := noteme
CLI_NAME      := noteme-cli
UPGRADE_NAME  := noteme-upgrade
MODULE        := noteme
IMAGE         := arekxv/note-me-go
VERSION       ?= $(shell git describe --tags --abbrev=0 2>/dev/null || echo dev)
BUILD_ID      ?= $(shell date +%s)
GIT_SHA       ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)

BIN_DIR       := bin
BINARY        := $(BIN_DIR)/$(APP_NAME)
CLI_BINARY    := $(BIN_DIR)/$(CLI_NAME)
UPGRADE_BINARY := $(BIN_DIR)/$(UPGRADE_NAME)
FRONTEND_DIR  := frontend
FRONTEND_DIST := $(FRONTEND_DIR)/dist

GO            ?= go
NPM           ?= npm
DOCKER        ?= docker
PODMAN        ?= podman

LDFLAGS := -s -w \
	-X $(MODULE)/internal/version.Version=$(VERSION) \
	-X $(MODULE)/internal/version.BuildID=$(BUILD_ID) \
	-X $(MODULE)/internal/version.GitSHA=$(GIT_SHA)

GO_BUILD_FLAGS := -trimpath -ldflags="$(LDFLAGS)"
GO_DIRS        := ./cmd ./internal ./frontend/embed.go

# Packages whose tests also run against PostgreSQL and MySQL (compose.test.yaml)
DATABASE_TEST_PACKAGES := ./internal/components/database/... ./internal/components/backups/... ./cmd/noteme-cli/...
TEST_COMPOSE      := $(DOCKER) compose -f compose.test.yaml
TEST_POSTGRES_DSN ?= postgres://noteme:noteme@127.0.0.1:55432/noteme?sslmode=disable
TEST_MYSQL_DSN    ?= mysql://root:noteme@127.0.0.1:53306/noteme

.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
.PHONY: deps deps-backend deps-frontend
deps: deps-backend deps-frontend ## Install backend and frontend dependencies

deps-backend: ## Download Go module dependencies
	$(GO) mod download

deps-frontend: ## Install frontend npm dependencies
	cd $(FRONTEND_DIR) && $(NPM) install

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------
.PHONY: setup-githooks dev dev-backend dev-frontend
setup-githooks: ## Install git hooks (pre-commit: make check, pre-push: make test)
	./scripts/setup-githooks.sh

dev: ## Run backend and frontend dev servers together (Ctrl+C stops both)
	@trap 'kill 0' INT TERM; \
		$(MAKE) --no-print-directory dev-backend & \
		$(MAKE) --no-print-directory dev-frontend & \
		wait

dev-backend: ## Run the Go server (serves API + websocket; frontend from Vite)
	mkdir -p $(FRONTEND_DIR)/dist && touch $(FRONTEND_DIR)/dist/.gitkeep
	$(GO) run ./cmd/$(APP_NAME)

dev-frontend: ## Run the Vite dev server (proxies /api, /file and /ws to the Go server)
	cd $(FRONTEND_DIR) && $(NPM) run dev

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
.PHONY: build build-frontend build-backend
build: build-frontend build-backend ## Build the frontend and both binaries

build-frontend: ## Build the Vue frontend into frontend/dist
	cd $(FRONTEND_DIR) && $(NPM) run build

build-backend: $(FRONTEND_DIST) ## Build the server (embeds frontend/dist), CLI and upgrade binaries
	mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 $(GO) build $(GO_BUILD_FLAGS) -o $(BINARY) ./cmd/$(APP_NAME)
	CGO_ENABLED=0 $(GO) build $(GO_BUILD_FLAGS) -o $(CLI_BINARY) ./cmd/$(CLI_NAME)
	CGO_ENABLED=0 $(GO) build $(GO_BUILD_FLAGS) -o $(UPGRADE_BINARY) ./cmd/$(UPGRADE_NAME)
	@echo "Built $(BINARY), $(CLI_BINARY) and $(UPGRADE_BINARY) ($(VERSION), build $(BUILD_ID))"

$(FRONTEND_DIST):
	mkdir -p $(FRONTEND_DIST)

# ---------------------------------------------------------------------------
# Quality
# ---------------------------------------------------------------------------
.PHONY: test test-backend test-databases test-frontend check check-backend check-frontend
test: test-backend test-databases test-frontend ## Run all tests

test-backend: ## Run Go tests (sqlite)
	$(GO) test ./... -race -count=1

test-databases: ## Run the database tests against PostgreSQL and MySQL in Docker (DOCKER=podman works too)
	$(TEST_COMPOSE) up -d --wait
	status=0; \
	TEST_DATABASE_DSN='$(TEST_POSTGRES_DSN)' $(GO) test $(DATABASE_TEST_PACKAGES) -race -count=1 || status=1; \
	TEST_DATABASE_DSN='$(TEST_MYSQL_DSN)' $(GO) test $(DATABASE_TEST_PACKAGES) -race -count=1 || status=1; \
	$(TEST_COMPOSE) down; \
	exit $$status

test-frontend: ## Run frontend tests (vitest)
	cd $(FRONTEND_DIR) && $(NPM) run test

check: format-check lint-check ## Format check and lint check (no tests)

check-backend: format-check-backend lint-check-backend ## Backend format and lint check

check-frontend: format-check-frontend lint-check-frontend ## Frontend format and lint check

# ---------------------------------------------------------------------------
# Formatting (gofmt / prettier)
# ---------------------------------------------------------------------------
.PHONY: format-check format-check-backend format-check-frontend format-fix format-fix-backend format-fix-frontend
format-check: format-check-backend format-check-frontend ## Check formatting of backend and frontend

format-check-backend: ## gofmt check
	@unformatted="$$(gofmt -l $(GO_DIRS))"; \
	if [ -n "$$unformatted" ]; then echo "gofmt: files need formatting:"; echo "$$unformatted"; exit 1; fi

format-check-frontend: ## prettier check
	cd $(FRONTEND_DIR) && $(NPM) run format:check

format-fix: format-fix-backend format-fix-frontend ## Format backend and frontend

format-fix-backend: ## gofmt write
	gofmt -w $(GO_DIRS)

format-fix-frontend: ## prettier write
	cd $(FRONTEND_DIR) && $(NPM) run format

# ---------------------------------------------------------------------------
# Linting (go vet / eslint)
# ---------------------------------------------------------------------------
.PHONY: lint-check lint-check-backend lint-check-frontend lint-fix lint-fix-backend lint-fix-frontend
lint-check: lint-check-backend lint-check-frontend ## Lint backend and frontend

lint-check-backend: ## go vet
	$(GO) vet ./...

lint-check-frontend: ## eslint + vue-tsc type-check
	cd $(FRONTEND_DIR) && $(NPM) run lint && $(NPM) run type-check

lint-fix: lint-fix-backend lint-fix-frontend ## Apply lint autofixes

lint-fix-backend: ## go fix (go vet has no autofix)
	$(GO) fix ./...
	$(GO) vet ./...

lint-fix-frontend: ## eslint --fix
	cd $(FRONTEND_DIR) && $(NPM) run lint:fix

# ---------------------------------------------------------------------------
# Database / CLI helpers (thin wrappers around noteme-cli subcommands)
# ---------------------------------------------------------------------------
.PHONY: migrate-up migrate-down new-migration upgrade
upgrade: ## Upgrade an original Deno database (DATABASE_DSN from .env): make upgrade [DB=path.sqlite] [FILES=dir]
	$(if $(DB),DATABASE_DSN=sqlite://$(DB)) $(if $(FILES),FILES_LOCATION=$(FILES)) $(GO) run ./cmd/$(UPGRADE_NAME)

migrate-up: ## Apply pending migrations
	$(GO) run ./cmd/$(CLI_NAME) migrate-up

migrate-down: ## Roll back the last migration
	$(GO) run ./cmd/$(CLI_NAME) migrate-down

new-migration: ## Create a new migration: make new-migration NAME=add_something
	@test -n "$(NAME)" || (echo "usage: make new-migration NAME=<name>" && exit 1)
	$(GO) run ./cmd/$(CLI_NAME) new-migration $(NAME)


# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------
.PHONY: docker-build docker-run podman-build
docker-build: ## Build the Docker image
	$(DOCKER) build \
		--build-arg BUILD_ID=$(BUILD_ID) \
		--build-arg VERSION=$(VERSION) \
		-t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

docker-run: ## Run the Docker image with ./.env
	$(DOCKER) run --rm -p 8000:8000 --env-file ./.env $(IMAGE):$(VERSION)

podman-build: ## Build the image with Podman
	$(PODMAN) build \
		--build-arg BUILD_ID=$(BUILD_ID) \
		--build-arg VERSION=$(VERSION) \
		-t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------
.PHONY: clean
clean: ## Remove build artifacts
	rm -rf $(BIN_DIR) coverage.out
	find $(FRONTEND_DIST) -mindepth 1 ! -name .gitkeep -delete 2>/dev/null || true
	rm -rf $(FRONTEND_DIR)/coverage
