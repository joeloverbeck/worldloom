# Worked Example: Reassessing SPEC-03 (Patch Engine)

This example walks through a hypothetical reassessment of `specs/SPEC-03-patch-engine.md`. It illustrates the pipeline shape — classification, reference extraction, findings presentation, pre-apply verification, post-apply confirmation — using realistic but invented findings. Real reassessments will produce different findings against the actual current codebase.

## Invocation

```
/reassess-spec specs/SPEC-03-patch-engine.md
```

## Pre-Process: Spec Classification

SPEC-03 introduces a new `tools/patch-engine/` package (TypeScript CLI + library) with surgical edit primitives, anchor-checksum drift detection, and a dry-run mode. The spec lists 7 deliverables, no existing `tools/patch-engine/` directory, and declares dependencies on SPEC-01 (world-index's anchor checksums) and SPEC-04 (validator framework for pre-commit checks).

**Classification: (a) new component**. Full Step 3 checklist (3.0–3.9) applies.

## Step 1: Mandatory Reads

- Read `specs/SPEC-03-patch-engine.md` (entire file, ~480 lines).
- Read `docs/FOUNDATIONS.md` (already loaded in this session).
- HARD-GATE-DISCIPLINE.md: skipped — the spec does not modify skill HARD-GATE semantics directly (it implements a patch primitive; skills invoke it under their own gates).

## Step 2: Extract References

References extracted (truncated to 14 for this walkthrough; a real SPEC-03 reassessment would produce ~25–30):

1. `tools/patch-engine/` — proposed package root (does not yet exist)
2. `tools/world-index/src/hash/content.ts` — existing, referenced by anchor-checksum API consumer
3. `anchor_checksum` — SQLite column in `nodes` table (see SPEC-01)
4. `expected_content_hash` — proposed PatchPlan field
5. `submit_patch_plan` — MCP tool (SPEC-02 stub, full impl in SPEC-03)
6. `PatchPlan` — proposed TypeScript interface
7. `PatchOperation` — proposed TypeScript interface
8. `EditAnchor` — proposed TypeScript interface
9. `validatePlan` — proposed exported function
10. `applyPlan` — proposed exported function
11. `patchengine --dry-run` — proposed CLI flag
12. `SPEC-01` — dependency
13. `SPEC-04` — dependency
14. `CANON_LEDGER.md` — write target for CF-record patches

≤15 references → mental tracking acceptable; no `TaskCreate` checklist needed.

## Step 3: Codebase Validation

**Load references/codebase-validation.md first.**
`Loaded codebase-validation.md — top section is "3.0 Cross-Package Scope Establishment"`

Validation sweep (summarized):

- **3.0 Cross-package scope**: `anchor_checksum` appears in `tools/world-index/src/schema/migrations/001_initial.sql` and `tools/world-index/src/hash/content.ts`. No other consumers. Confirms SPEC-03 needs a direct dependency on world-index's schema, not a re-implementation.
- **3.1 File paths**: All referenced paths either exist (world-index files) or are proposed (patch-engine package). No drift.
- **3.2 Types**: SPEC-01's `anchor_checksum` is `TEXT NOT NULL` (SQLite) stored as sha256-hex. SPEC-03's `expected_content_hash` proposed as `string` — consistent.
- **3.3 Functions**: `submit_patch_plan` stubbed at `tools/world-mcp/src/tools/submit-patch-plan.ts` (per SPEC-02). Full implementation lives in SPEC-03.
- **3.4 Dependencies**: SPEC-01 confirmed live. SPEC-04 confirmed live (same phase).
- **3.5 Skill-structure**: N/A — SPEC-03 doesn't modify any SKILL.md.
- **3.6 Downstream consumers**: `canon-addition` skill (per SPEC-06 Part A) will consume `submit_patch_plan`. Confirmed.
- **3.7 Package boundaries**: SPEC-03 imports `anchor_checksum` computation from `world-index`. ✓ Allowed (world-index → patch-engine). SPEC-03 does not reach into `world-index/src/parse/`. ✓ Boundary respected.
- **3.8 Upstream spec refs**: SPEC-06 references SPEC-03's patch-plan contract. Confirmed alignment.
- **3.9 FOUNDATIONS-contract fidelity**: SPEC-03 proposes a pre-commit Mystery Reserve check: reject any patch that would modify an `M-N` entry's `known_answer` field. ✓ Rule 7 preserved.

## Step 4: FOUNDATIONS Alignment Check

**Load references/foundations-alignment.md first.**
`Loaded foundations-alignment.md — opens with "4.0 Internal Contradictions"`

- **§Tooling Recommendation**: ✓ SPEC-03 declares world-state read contract (reads `anchor_checksum`, `content_hash` from world-index; reads target file content; reads `MYSTERY_RESERVE.md` for firewall check).
- **§Canon Fact Record Schema**: ✓ SPEC-03 preserves every field when patching a CF record.
- **Rule 6 No Silent Retcons**: ✓ Every applied patch records which `CH-NNNN` approved it via anchor-checksum metadata.
- **Rule 7 Preserve Mystery Deliberately**: ✓ MR firewall check implemented at pre-commit.
- **Canon-Pipeline Impact Rule (4.4)**: triggered; all 7 items pass.

## Step 6: Present Findings

```
## Reassessment: SPEC-03-patch-engine.md

### Classification
(a) new component — introduces tools/patch-engine/ package. Steps applied: 3.0–3.4, 3.6–3.9, 4.0–4.4. Steps skipped: 3.5 (no SKILL.md changes).
Redesign count: 0/7 deliverables materially changed (below 50% threshold; Substantial Redesign Flag omitted).

### Issues (must fix)
1. **[HIGH] D4 Dry-run mode lacks output format specification** — spec says "dry-run reports planned changes" but doesn't specify format (JSON? human-readable? JSONL?). Downstream `canon-addition` will consume the dry-run output for user-preview purposes. Recommendation: specify JSON output matching PatchPlan schema + human-readable summary for TTY output (mirrors `world-index --help` convention).

### Improvements (should fix)
1. **[MEDIUM] D6 Rollback semantics underspecified** — spec says "failed patches roll back", but doesn't name whether rollback uses SQLite transactions, file-system copy-on-write, or a two-phase commit log. Recommendation: specify two-phase commit log at tools/patch-engine/src/rollback/ with append-only log file and replay on next run.
2. **[LOW] D2 TypeScript interface naming inconsistency** — proposed types use `Plan`/`Operation`/`Anchor` whereas world-index uses `Node`/`Edge`/`Mention`. Recommendation: rename to `PatchPlan`/`PatchOperation`/`EditAnchor` (already consistent — no change needed).

### Additions (consider adding)
1. **[LOW] A1 Add --verbose flag** — spec's CLI surface lacks a verbose mode for debugging. Every other worldloom tool (world-index, validators) ships one. Recommendation: add `--verbose` / `-v` flag.

### FOUNDATIONS.md Alignment
- §Tooling Recommendation: aligned
- §Canon Fact Record Schema: aligned
- Rule 6 No Silent Retcons: aligned
- Rule 7 Preserve Mystery Deliberately: aligned

### Canon-Pipeline Impact Rule
1. Write authority — pass (HARD-GATE on canon-addition controls commit)
2. Scope declaration — pass (single-world, world-slug required)
3. Audit trail — pass (anchor-checksum metadata + CH-NNNN reference)
4. Mystery Reserve firewall — pass (pre-commit check)
5. Invariant preservation — pass (validator framework gate)
6. Canon-layer discipline — pass (layer transitions require adjudication via canon-addition)
7. Rollback discipline — pass (two-phase commit log, pending D6 clarification)

### Questions
1. Dry-run output format: (a) JSON-only (machine consumers), (b) JSON + human-readable (TTY detection), (c) JSONL per operation. Recommendation: (b).
```

User responds: `1) b`.

## Step 7: Pre-Apply Verification Table

| Finding | Check | Result |
|---|---|---|
| I1 | `grep -rn "dry-run" specs/SPEC-03-patch-engine.md` | 2 matches (both in D4) — confirms D4 scope |
| M1 | `test -d tools/patch-engine/src/rollback` | directory does not exist — confirms proposed path is new |
| M2 | `grep -rn "interface Patch" specs/SPEC-03-patch-engine.md` | 3 matches — confirms current names already consistent; retracted: no substitute fix |
| A1 | `grep -rn "verbose" tools/world-index/src/cli.ts` | 4 matches — confirms convention |

Mismatch: M2 reclassified as `retracted: no-op` — SPEC-03 already uses consistent naming; the finding was a false positive from Step 3. Proceeding.

**Load references/spec-writing-rules.md.**
`Loaded spec-writing-rules.md — opens with "Pre-Apply Verification"`

Apply I1, M1, A1. Skip M2 (retracted).

## Step 8: Final Summary

- Issues fixed: 1 (I1 — dry-run format spec'd)
- Improvements applied: 1 (M1 — rollback two-phase commit log spec'd)
- Additions incorporated: 1 (A1 — verbose flag)
- Retracted: M2 (false positive, no substitute fix)
- Post-apply confirmation: zero matches for eliminated references; 3 matches for corrected references (`--dry-run format`, `tools/patch-engine/src/rollback/`, `--verbose`).
- Sections that changed substantially: D4 (Dry-run), D6 (Rollback), §CLI surface.
- Classification shift: none.
- Suggested next step: Review the updated SPEC-03, then either (a) decompose into tickets by hand, or (b) invoke a ticket-decomposition skill when one is created. reassess-spec prepares specs for decomposition but does not perform it.

Do NOT commit. Leave the file for user review.
