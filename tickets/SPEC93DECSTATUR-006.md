# SPEC93DECSTATUR-006: Retire Hook 6 and Hook 7

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/hooks` (delete `hook6-guard-story-markdown-hash.ts` + `hook7-guard-prose-receipt-hash.ts` + suites; `README.md`); `.claude/settings.json.example`
**Deps**: None

## Problem

Hook 6 (`hook6-guard-story-markdown-hash`) guards `plan_hash` drift on `pages-prose-plans/PG-*.md` + bundle `INDEX.md`; Hook 7 (`hook7-guard-prose-receipt-hash`) guards prose-receipt hashes. Both guard hashes that no longer exist on new artifacts once page plans and the page prose-receipt path are removed (SPEC-93 §2.5). This ticket retires both hooks, their test suites, their wiring in `.claude/settings.json.example`, and their `tools/hooks/README.md` entries.

## Assumption Reassessment (2026-05-28)

1. `tools/hooks/src/hook6-guard-story-markdown-hash.ts` (warn-only since SPEC-72) and `hook7-guard-prose-receipt-hash.ts` (deny) exist with colocated test suites; both are wired in `.claude/settings.json.example` (hook 6 + hook 7 entries) and documented in `tools/hooks/README.md` — confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §2.5 + §6 hooks bullet: retire both hooks + update `settings.json.example` + `tools/hooks/README.md`; §9 hooks test bullet: Hook 6/7 suites removed, remaining hooks green, settings.json.example no longer wires the two retired hooks.
3. Cross-artifact boundary: the hooks are wired in `.claude/settings.json.example` (the shared hook-config surface) and documented in `tools/hooks/README.md`; the guarded artifacts (`pages-prose-plans/`, `pages-prose-receipts/`) become legacy-read-only.
4. (was template item 5 — HARD-GATE / Canon Safety hooks surface) Hook 6/7 are `tools/hooks/` enforcement points, but they guard **non-canon story-bundle markdown artifacts** (page plans / page prose-receipts), not canon or story-bundle record writes — the §3.9/§4.4 non-canon-hook carve-out applies. The authoritative Mystery Reserve firewall is gate 3 on the `PG` record (untouched) plus `scene_range_forbidden_mystery_resolution` at scene attach (SPEC-92); retiring these two markdown-hash guards does NOT weaken the MR firewall.
5. (was template item 7 — hook removal blast radius) Grep pipeline-wide for `hook6-guard-story-markdown-hash` / `hook7-guard-prose-receipt-hash`: `.claude/settings.json.example` (unwire), `tools/hooks/README.md` (remove entries), `tools/hooks/tests/` (delete suites), and any docs referencing the hook numbers (docs reconciliation in SPEC93DECSTATUR-011).

## Architecture Check

1. Retiring both hooks (vs. leaving them inert) is correct because the artifacts they guard are no longer produced for new pages; an inert guard on a non-produced artifact is dead config the §8 sweep forbids.
2. No backwards-compatibility shim: the hook scripts, suites, and settings wiring are deleted outright. Legacy `pages-prose-*` artifacts remain on disk as read-only; they are no longer write-guarded, consistent with their grandfathered append-only status.

## Verification Layers

1. Hooks removed -> codebase grep-proof (`hook6-guard-story-markdown-hash` / `hook7-guard-prose-receipt-hash` absent from `tools/hooks/src` + `.claude/settings.json.example`).
2. Remaining hooks unaffected -> test green (`tools/hooks` suite passes with hooks 1–5 intact).
3. MR firewall not weakened -> FOUNDATIONS alignment check (Rule 7; non-canon-hook carve-out; gate 3 + scene firewall untouched).

## What to Change

### 1. Delete hook scripts + suites

Remove `tools/hooks/src/hook6-guard-story-markdown-hash.ts`, `tools/hooks/src/hook7-guard-prose-receipt-hash.ts`, and their colocated test suites `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`, `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts`.

### 2. Unwire from settings.json.example

In `.claude/settings.json.example`: remove the Hook 6 and Hook 7 matcher/command entries (and any explanatory commentary).

### 3. README

In `tools/hooks/README.md`: remove the Hook 6 + Hook 7 descriptions; note the retirement leaves a numbering gap (harmless).

## Files to Touch

- `tools/hooks/src/hook6-guard-story-markdown-hash.ts` (delete)
- `tools/hooks/src/hook7-guard-prose-receipt-hash.ts` (delete)
- `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` (delete)
- `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts` (delete)
- `.claude/settings.json.example` (modify)
- `tools/hooks/README.md` (modify)

## Out of Scope

- Hooks 1–5 (untouched).
- The FOUNDATIONS / docs references to the hooks (docs reconciliation in SPEC93DECSTATUR-011).
- The `pages-prose-plans/` / `pages-prose-receipts/` legacy artifacts on disk (grandfathered, not deleted).

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/hooks && npm run build && npm test)` green with hooks 1–5 intact and the Hook 6/7 suites removed.
2. `.claude/settings.json.example` no longer wires `hook6-guard-story-markdown-hash` or `hook7-guard-prose-receipt-hash`.
3. `grep -rn "hook6-guard-story-markdown-hash\|hook7-guard-prose-receipt-hash" tools/hooks/src .claude/settings.json.example` returns zero matches.

### Invariants

1. The remaining hooks (1–5) are unaffected.
2. The Mystery Reserve firewall (gate 3 + scene `scene_range_forbidden_mystery_resolution`) is not weakened by the retirement.

## Test Plan

### New/Modified Tests

1. Deleted: `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`, `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts`.

### Commands

1. `(cd tools/hooks && npm run build && npm test)`
2. `grep -rn "hook6-guard\|hook7-guard" tools/hooks .claude/settings.json.example` — expect zero (outside annotated legacy mentions).
