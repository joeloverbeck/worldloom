#!/usr/bin/env bash
set -euo pipefail

# Refresh tests/fixtures/animalia/ from the live worlds/animalia/ snapshot.
# Excludes _index/ (gitignored SQLite, rebuilt per-test from the YAML records).
# Manual invocation only — CI does NOT call this. Run after intentional changes
# to live animalia that should propagate into test assertions.

ROOT="$(git rev-parse --show-toplevel)"
SRC="$ROOT/worlds/animalia"
DST="$ROOT/tests/fixtures/animalia"

if [ ! -d "$SRC" ]; then
  echo "error: $SRC does not exist; cannot refresh fixture" >&2
  exit 1
fi

rm -rf "$DST"
mkdir -p "$DST"
rsync -a --exclude '_index/' "$SRC/" "$DST/"

echo "Refreshed fixture: $SRC -> $DST (excluded: _index/)"
