#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/worldloom-hooks-dist.XXXXXX")"
HAD_DIST=0

cleanup() {
  local status=$?

  if [[ "$HAD_DIST" -eq 1 && -d "$TMP_DIR/original-dist" ]]; then
    rm -rf "$DIST_DIR"
    cp -a "$TMP_DIR/original-dist" "$DIST_DIR"
  fi

  rm -rf "$TMP_DIR"
  exit "$status"
}
trap cleanup EXIT

write_manifest() {
  local dir="$1"
  local output="$2"

  if [[ ! -d "$dir" ]]; then
    : > "$output"
    return
  fi

  (
    cd "$dir"
    find . -type f -print0 \
      | sort -z \
      | while IFS= read -r -d '' file; do
          sha256sum "$file" | awk -v path="${file#./}" '{ print path "\t" $1 }'
        done
  ) > "$output"
}

cd "$ROOT_DIR"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "tools/hooks/dist is missing; building hooks dist from source."
  npm run build
  exit 0
fi

HAD_DIST=1
cp -a "$DIST_DIR" "$TMP_DIR/original-dist"
write_manifest "$DIST_DIR" "$TMP_DIR/original.manifest"

npm run build
write_manifest "$DIST_DIR" "$TMP_DIR/rebuilt.manifest"

if ! diff -u "$TMP_DIR/original.manifest" "$TMP_DIR/rebuilt.manifest"; then
  cat <<'MSG' >&2

tools/hooks/dist is stale relative to tools/hooks/src.
Run:
  cd tools/hooks && npm run build

The check restored the original dist directory before exiting.
MSG
  exit 1
fi

echo "tools/hooks/dist matches npm run build output."
