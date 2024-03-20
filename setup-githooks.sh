#!/bin/sh
echo "deno task check" > .git/hooks/pre-commit
echo "deno task test" > .git/hooks/pre-push
echo "Hooks installed."
