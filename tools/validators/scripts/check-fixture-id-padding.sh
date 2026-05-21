#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
baseline_file="$repo_root/tools/validators/scripts/fixture-id-padding-baseline.tsv"
pattern='(PG|SE|BEL|SF|CHC|OBL|CNSQ|THR|SREL|STSTAT|STENT|STINT|STLOC|STOBJ|SLT|DA|BR|CF|CH|INV|M|OQ|ENT|SEC|PA|CHAR|AU|RP|SAU|SP|RSP)-(0[0-9]+)'

usage() {
  cat >&2 <<'USAGE'
Usage: check-fixture-id-padding.sh [--update-baseline]

By default, scans repo fixture/test surfaces and fails when a padded ID appears
more times than recorded in fixture-id-padding-baseline.tsv.

Set FIXTURE_ID_LINT_ROOTS to a colon-separated path list to scan explicit temp
roots without the repo baseline. This is intended for positive/negative proof.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 1 || ( $# -eq 1 && "${1:-}" != "--update-baseline" ) ]]; then
  usage
  exit 2
fi

update_baseline=false
if [[ "${1:-}" == "--update-baseline" ]]; then
  update_baseline=true
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "Missing required command: rg. Install ripgrep before running fixture ID padding lint." >&2
  exit 2
fi

make_counts() {
  local output_file="$1"
  shift

  if [[ $# -eq 0 ]]; then
    : >"$output_file"
    return
  fi

  if [[ -n "${FIXTURE_ID_LINT_ROOTS:-}" ]]; then
    (cd "$repo_root" && { rg -n -o "$pattern" "$@" \
      --glob '**/*.{ts,json,yaml,yml}' \
      --glob '!**/node_modules/**' \
      --glob '!**/dist/**' \
      --glob '!archive/**' \
      --glob '!**/archive/**' || true; } \
      | awk -F: '{ count[$1 "\t" $3]++ } END { for (key in count) print key "\t" count[key] }' \
      | sort >"$output_file")
  else
    (cd "$repo_root" && { rg -n -o "$pattern" "$@" \
      --glob '**/tests/**/*.{ts,json,yaml,yml}' \
      --glob '**/src/**/*-fixture.ts' \
      --glob '!**/node_modules/**' \
      --glob '!**/dist/**' \
      --glob '!archive/**' \
      --glob '!**/archive/**' || true; } \
      | awk -F: '{ count[$1 "\t" $3]++ } END { for (key in count) print key "\t" count[key] }' \
      | sort >"$output_file")
  fi
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

current_counts="$tmp_dir/current.tsv"

if [[ -n "${FIXTURE_ID_LINT_ROOTS:-}" ]]; then
  IFS=':' read -r -a scan_roots <<<"$FIXTURE_ID_LINT_ROOTS"
  make_counts "$current_counts" "${scan_roots[@]}"
  baseline_counts="$tmp_dir/empty-baseline.tsv"
  : >"$baseline_counts"
else
  make_counts "$current_counts" "tools"
  baseline_counts="$baseline_file"
fi

if $update_baseline; then
  if [[ -n "${FIXTURE_ID_LINT_ROOTS:-}" ]]; then
    echo "--update-baseline cannot be used with FIXTURE_ID_LINT_ROOTS" >&2
    exit 2
  fi
  cp "$current_counts" "$baseline_file"
  echo "Updated $baseline_file" >&2
  exit 0
fi

if [[ ! -f "$baseline_counts" ]]; then
  echo "Missing fixture ID padding baseline: $baseline_counts" >&2
  echo "Run tools/validators/scripts/check-fixture-id-padding.sh --update-baseline after reviewing current legacy hits." >&2
  exit 2
fi

awk -F '\t' '
  FILENAME == ARGV[1] {
    baseline[$1 "\t" $2] = $3
    next
  }
  {
    key = $1 "\t" $2
    current = $3 + 0
    allowed = (key in baseline) ? baseline[key] + 0 : 0
    if (current > allowed) {
      split($2, parts, "-")
      n = parts[2]
      sub(/^0+/, "", n)
      if (n == "") n = "0"
      corrected = parts[1] "-" n
      printf "%s: padded ID %s appears %d time(s), baseline allows %d; use %s or update the reviewed baseline\n", $1, $2, current, allowed, corrected > "/dev/stderr"
      failures = 1
    }
  }
  END { exit failures ? 1 : 0 }
' "$baseline_counts" "$current_counts"
