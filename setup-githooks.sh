#!/bin/sh
echo "deno task check" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Hooks installed."
