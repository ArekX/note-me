#!/bin/sh
# Points git at the hooks committed in .githooks (pre-commit: make check,
# pre-push: make test). Run once per clone: make setup-githooks
set -e
cd "$(git rev-parse --show-toplevel)"
chmod +x .githooks/*
git config core.hooksPath .githooks
echo "Git hooks installed (core.hooksPath = .githooks)."
