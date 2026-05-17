#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
pattern='archive/specs/SPEC-|archive/tickets/'
authority_terms='(^\*\*design\*\*|^design authority|design authority|current authority|current-authority|source of truth|original design|current design)'

# Whitelist markers describe legitimate historical citations, not current
# authority claims:
# - **Supersedes**: archived predecessor links in spec headers.
# - historical / archived-as-context / archived for reference / prior art:
#   explicit non-authority framing.
# - archived spec / archived ticket: explicit archive-state wording.
whitelist='(\*\*supersedes\*\*:|historical|archived for reference|archived-as-context|archived spec|archived ticket|prior art)'

usage() {
  cat >&2 <<'USAGE'
Usage: check-archive-citation-discipline.sh

Scans current-authority markdown surfaces for archive/spec or archive/ticket
citations that are not explicitly marked as historical context.

Set ARCHIVE_CITATION_LINT_ROOTS to a colon-separated path list to scan explicit
temp roots instead of the repo's default documentation surface.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 0 ]]; then
  usage
  exit 2
fi

tmp_files="$(mktemp)"
trap 'rm -f "$tmp_files"' EXIT

existing_roots() {
  local root
  for root in "$@"; do
    [[ -e "$repo_root/$root" || "$root" == /* && -e "$root" ]] || continue
    printf '%s\n' "$root"
  done
}

collect_files() {
  if [[ -n "${ARCHIVE_CITATION_LINT_ROOTS:-}" ]]; then
    IFS=':' read -r -a roots <<<"$ARCHIVE_CITATION_LINT_ROOTS"
    mapfile -t present_roots < <(existing_roots "${roots[@]}")
    if [[ "${#present_roots[@]}" -gt 0 ]]; then
      (cd "$repo_root" && find "${present_roots[@]}" \
        -path '*/archive/*' -prune -o \
        -path '*/tickets/*' -prune -o \
        -path '*/node_modules/*' -prune -o \
        -path '*/dist/*' -prune -o \
        -type f -name '*.md' -print)
    fi
    return
  fi

  (
    cd "$repo_root"
    mapfile -t doc_roots < <(existing_roots docs .claude/skills specs)
    if [[ "${#doc_roots[@]}" -gt 0 ]]; then
      find "${doc_roots[@]}" \
        -path '*/archive/*' -prune -o \
        -path '*/tickets/*' -prune -o \
        -path '*/node_modules/*' -prune -o \
        -path '*/dist/*' -prune -o \
        -type f -name '*.md' -print
    fi
    find tools \
      -path '*/archive/*' -prune -o \
      -path '*/node_modules/*' -prune -o \
      -path '*/dist/*' -prune -o \
      -type f -name 'README.md' -print
    find . -maxdepth 1 -type f -name '*.md' -print
  )
}

collect_files | sort -u >"$tmp_files"

failures=0

while IFS= read -r rel_path; do
  [[ -n "$rel_path" ]] || continue
  if [[ "$rel_path" == /* ]]; then
    file="$rel_path"
    display_path="$rel_path"
  else
    file="$repo_root/$rel_path"
    display_path="$rel_path"
  fi
  mapfile -t lines <"$file"

  for i in "${!lines[@]}"; do
    line="${lines[$i]}"
    if [[ "$line" != *archive/specs/SPEC-* && "$line" != *archive/tickets/* ]]; then
      continue
    fi

    start=$(( i >= 3 ? i - 3 : 0 ))
    context=""
    for (( j=start; j<=i; j++ )); do
      context+="${lines[$j]}"$'\n'
    done
    context_lc="${context,,}"

    if [[ "$context_lc" =~ $whitelist ]]; then
      continue
    fi

    line_lc="${line,,}"
    if [[ "$line_lc" =~ $authority_terms ]]; then
      printf '%s:%d: archive citation found without whitelist marker; add a historical-context marker or remove the citation\n' "$display_path" "$((i + 1))" >&2
      failures=1
    fi
  done
done <"$tmp_files"

exit "$failures"
