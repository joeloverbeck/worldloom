# SPEC02PHA2TOO-004: Part B docs consistency — remove `get_compiled_view` reference from MACHINE-FACING-LAYER.md

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — edits `docs/MACHINE-FACING-LAYER.md` (single-line edit within the Phase 1.5 canonical-storage-layer bullet). No code changes; documentation-only.
**Deps**: None

## Problem

Reassessment (2026-04-24, captured in SPEC-02-PHASE2 §"SPEC-13 `get_compiled_view` commitment — dropped at reassessment") dropped the `get_compiled_view` MCP tool commitment per YAGNI — no consumer surfaced. The commitment was originally written into `archive/specs/SPEC-13-atomic-source-migration.md:255` and forward-referenced from `docs/MACHINE-FACING-LAYER.md:40`, which currently names both the `world-index render` CLI and `mcp__worldloom__get_compiled_view` as render surfaces. Since this spec no longer delivers `get_compiled_view`, the doc reference is now stale and must be removed to preserve Rule 6 (No Silent Retcons) — doc claims must match active-spec commitments.

Consumers named in the spec: none (this is documentation-only); the target is the doc itself. Rule 6 attribution chain: the retcon is visible in SPEC-02-PHASE2's Problem Statement §drop subsection + its Risks §"get_compiled_view re-introduction risk" entry. Landing this ticket closes the final dangling doc reference so the codebase-wide grep for `mcp__worldloom__get_compiled_view` under `docs/` returns zero matches.

## Assumption Reassessment (2026-04-25)

1. `docs/MACHINE-FACING-LAYER.md:40` currently reads (confirmed at reassessment post-apply confirmation): "Merged markdown views, if produced, are human-facing surfaces only (see `world-index render <world-slug> [--file <class>]` CLI — not delivered in this phase; driven by a future human-UX spec if/when authored); they are read-only and are not persisted. LLM agents consume atomic records via `mcp__worldloom__get_record` / `get_context_packet` instead." — wait: reassessment already applied this change. Re-verify live state at ticket-implementation time: `grep -n "get_compiled_view" docs/MACHINE-FACING-LAYER.md` must return zero matches before this ticket's Edit runs. If the reassessment's Part B edit already landed, this ticket's Edit is a no-op and the ticket closes as "already landed via reassessment Part B application." This should be flagged at Step 6 of ticket implementation.
2. `docs/FOUNDATIONS.md:454` also references the `world-index render` CLI but does NOT reference `get_compiled_view` by name — confirmed via reassessment post-apply grep (`grep -n "get_compiled_view" docs/FOUNDATIONS.md` returned zero matches). FOUNDATIONS.md needs no edit under this ticket.
3. Shared boundary: `docs/MACHINE-FACING-LAYER.md` is the operational-overview doc cross-referenced from `docs/FOUNDATIONS.md:444`. Its claims must stay consistent with the active spec surface. When a spec drops a tool, the doc must drop its reference in lockstep.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons). The drop of `get_compiled_view` is a retcon of SPEC-13 §C line 255's commitment; SPEC-02-PHASE2's Problem Statement surfaces the retcon explicitly. The Part B docs edit completes the retcon's visibility — a retcon recorded only in the spec prose but not mirrored in downstream docs is a half-silent retcon.
5. Mismatch + correction: at reassessment time I emitted the Part B edit to `docs/MACHINE-FACING-LAYER.md:40` AS PART OF the reassess-spec skill's Step 7 application (not as a separate ticket). If that reassessment edit survives to this ticket's implementation, this ticket is a grep-proof-only verification ticket and its Edit is a no-op. Implementation must begin with `grep -n "mcp__worldloom__get_compiled_view" docs/` — zero matches means the work already landed; any match means re-apply the Part B text per the spec's Part B §B1 block.

## Architecture Check

1. Landing the docs update as its own ticket (rather than inlining into ticket 001 or 003) keeps the reviewable diff single-concern: a docs-only change reviewable independently of code changes. A reviewer reading this ticket doesn't need to evaluate MCP tool logic.
2. Preserving the `world-index render` CLI reference as aspirational (not delivered, driven by a future human-UX spec) keeps future-spec space open without over-constraining. The reassessment already made this decision; this ticket honors it.
3. No backwards-compatibility aliasing/shims introduced. The doc edit is a pure text-content change; no cross-reference paths relocate.

## Verification Layers

1. `get_compiled_view` reference removed from MACHINE-FACING-LAYER.md → codebase grep-proof (`grep -n "get_compiled_view" docs/MACHINE-FACING-LAYER.md` returns 0 matches).
2. Repository-wide `docs/` references to `get_compiled_view` are zero → codebase grep-proof (`grep -rn "get_compiled_view" docs/` returns 0 matches; the only surviving references should be within `specs/SPEC-02-phase2-tooling.md` rationale text and `archive/specs/SPEC-13-atomic-source-migration.md`'s historical commitment).
3. `world-index render` CLI reference preserved → codebase grep-proof (`grep -n "world-index render" docs/MACHINE-FACING-LAYER.md` returns ≥1 match).
4. `get_record` / `get_context_packet` named as the LLM consumption path → codebase grep-proof (`grep -n "mcp__worldloom__get_record" docs/MACHINE-FACING-LAYER.md` returns ≥1 match).
5. Rule 6 alignment → FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Rule 6 reads "All canon changes must be logged with justification." The drop of `get_compiled_view` is logged in SPEC-02-PHASE2's Problem Statement and Risks sections; the docs edit completes the attribution chain.

## What to Change

### 1. Edit `docs/MACHINE-FACING-LAYER.md:40` (modify)

If `grep -n "mcp__worldloom__get_compiled_view" docs/MACHINE-FACING-LAYER.md` returns any match, apply the Part B §B1 replacement text from SPEC-02-PHASE2:

Replace (current):
> Merged markdown views are produced on demand by `world-index render <world-slug> [--file <class>]` and `mcp__worldloom__get_compiled_view`; they are read-only and are not persisted.

With (target):
> Merged markdown views, if produced, are human-facing surfaces only (see `world-index render <world-slug> [--file <class>]` CLI — not delivered in this phase; driven by a future human-UX spec if/when authored); they are read-only and are not persisted. LLM agents consume atomic records via `mcp__worldloom__get_record` / `get_context_packet` instead.

If the grep returns zero matches, the reassessment's Part B application already landed the edit; skip the Edit call and note "already landed via reassessment Part B" in the ticket close-out.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify — single-line edit at line 40, OR no-op if already applied via reassessment)

## Out of Scope

- Removing the `world-index render` CLI reference from `docs/MACHINE-FACING-LAYER.md` or `docs/FOUNDATIONS.md:454`. The CLI remains aspirational (per SPEC-02-PHASE2 §Out of Scope).
- Archiving or editing `archive/specs/SPEC-13-atomic-source-migration.md:255`. Archived specs are historical; the retcon is captured in the active spec, not in the archive.
- Documentation drift audits on other `docs/*.md` files — `grep -rn "get_compiled_view" docs/` confirms the scope is limited to one file at reassessment time.
- Re-introducing `get_compiled_view` — per SPEC-02-PHASE2 §Risks §"get_compiled_view re-introduction risk", any re-introduction runs through its own reassessment + brainstorm, not inline here.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "mcp__worldloom__get_compiled_view" docs/MACHINE-FACING-LAYER.md` returns 0 matches.
2. `grep -rn "get_compiled_view" docs/` returns 0 matches (all `docs/*.md` files free of the dropped-tool reference).
3. `grep -n "world-index render" docs/MACHINE-FACING-LAYER.md` returns ≥1 match (CLI reference preserved).
4. `grep -n "mcp__worldloom__get_record\|get_context_packet" docs/MACHINE-FACING-LAYER.md` returns ≥1 match confirming the LLM consumption path is named.

### Invariants

1. The Part B §B1 replacement text from SPEC-02-PHASE2 is the authoritative source — the doc text must match it byte-for-byte.
2. `docs/FOUNDATIONS.md:454` is NOT edited under this ticket — its text references only the CLI, not `get_compiled_view`.
3. The retcon is Rule-6-visible: SPEC-02-PHASE2 Problem Statement §"SPEC-13 `get_compiled_view` commitment — dropped at reassessment" attributes the doc change; this ticket does not create an orphan edit.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "get_compiled_view" docs/` — full `docs/` sweep; expect 0 matches.
2. `grep -n "world-index render\|mcp__worldloom__get_record\|mcp__worldloom__get_context_packet" docs/MACHINE-FACING-LAYER.md` — expect ≥3 matches total (CLI reference + two LLM-path surfaces).
3. `grep -c "get_compiled_view" specs/SPEC-02-phase2-tooling.md archive/specs/SPEC-13-atomic-source-migration.md` — expect ≥1 per file (the retcon narrative survives in the active spec rationale and the historical archived spec; these are not docs and do not need cleaning).
