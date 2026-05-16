#!/usr/bin/env bash
set -euo pipefail

# Build every tools/ package in dependency order.
# Manual invocation: ./scripts/build-all.sh
# Dependency order is: world-index → patch-engine → validators → (hooks, world-mcp).

ROOT="$(git rev-parse --show-toplevel)"
PACKAGES=(world-index patch-engine validators hooks world-mcp)

for pkg in "${PACKAGES[@]}"; do
  dir="$ROOT/tools/$pkg"
  if [ ! -d "$dir" ]; then
    echo "error: $dir does not exist" >&2
    exit 1
  fi
  echo "=== building $pkg ==="
  (cd "$dir" && npm run build)
done

echo "=== build-all complete ==="
