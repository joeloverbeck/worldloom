#!/usr/bin/env bash
set -euo pipefail

# Build and test every tools/ package in dependency order, failing fast on the
# first non-zero exit. Manual invocation: ./scripts/check-all.sh
# Dependency order is: world-index → patch-engine → validators → hooks → world-mcp → story-explorer.

ROOT="$(git rev-parse --show-toplevel)"
PACKAGES=(world-index patch-engine validators hooks world-mcp story-explorer)

for pkg in "${PACKAGES[@]}"; do
  dir="$ROOT/tools/$pkg"
  if [ ! -d "$dir" ]; then
    echo "error: $dir does not exist" >&2
    exit 1
  fi
  echo "=== $pkg: build ==="
  (cd "$dir" && npm run build)
  echo "=== $pkg: test ==="
  (cd "$dir" && npm test)
done

echo "=== check-all complete: all packages green ==="
