# BSBOOT-029: Janitorial sweep — L1 through L5 nits in `branching-story-bootstrap`

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — janitorial documentation edits inside `.claude/skills/branching-story-bootstrap/` plus one one-character edit in `.claude/skills/_shared-templates/page-plan.md`.
**Deps**: None. Independent of BSBOOT-025/026/027/028.

## Problem

Five low-severity inconsistencies in the bootstrap surface that don't change behavior but each cost a reader a few seconds of confusion. Bundling them as a single janitorial sweep is cheaper than five tickets.

1. **L1 — "five fields" off-by-one.** `references/phase-7-root-page-plan.md` §18 says `AUTHOR-WRITTEN five fields:` and then enumerates six (ENTRY PRESSURE / SCENE QUESTION / VALUE DELTA TARGET / REQUIRED TURN / STOPPING POINT / DO NOT REVEAL). The same off-by-one appears in the canonical template `.claude/skills/_shared-templates/page-plan.md` §18.
2. **L2 — "~75 ops" arithmetic.** `references/engine-envelope-shape.md` §1 line 31 says `A typical bootstrap envelope contains ~75 ops (4 STENT + 19-22 SF + 1 SE + 8 OBL + 4 THR + 2 SREL + 3 STINT + 5 STLOC + 3 STOBJ + 20 SLT + 1 BR + 1 PG + 5 CHC)`. The enumeration sums to 4+22+1+8+4+2+3+5+3+20+1+1+5 = 79 at the upper end of the SF range, 4+19+... = 76 at the lower. "~75" is off; "~75-80" matches the named bands.
3. **L3 — "(NEW)" vestigial annotations.** `references/phase-9-validation-gates.md` table row for gate 19 reads `plan_completeness_check (NEW)` and `references/phase-9-5-bootstrap-discipline-validator.md` table row for check 11 reads `plan_self_containment (NEW)`. The "(NEW)" markers were useful during the PROSESPLIT ticket implementation; now that the gate and check are merged contract, the annotation conveys nothing and risks misleading readers into thinking the gate is a draft.
4. **L4 — Opaque internal ticket references.** `references/phase-9-5-bootstrap-discipline-validator.md` row 3 reads `STINT structural completeness (post-BSBOOT-003)` and row 6 reads `SF.reader_visibility_basis (post-BSBOOT-010)`. The ticket numbers tell future readers nothing about the rule's intent; they exist as provenance breadcrumbs only. Replace with a one-line semantic justification.
5. **L5 — CHC schema yaml-vs-prose inconsistency.** `templates/story-records.yaml` CHC schema (lines 384, 393, etc.) uses pipe-separated alternatives inline as if they were yaml values (`target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract`, `uses_fact: SF-NNNN | null`). Earlier in the file, similar pipe-separated alternatives appear as inline comments (e.g., line 31 `role_in_story: protagonist               # protagonist | major | supporting | antagonist | foil`). The CHC section's mid-value pipe-syntax breaks if the file is yaml-parsed and is stylistically inconsistent with the rest of the file. Move the alternative enumeration into a comment.

## Assumption Reassessment (2026-05-11)

1. L1: `references/phase-7-root-page-plan.md` line 128 verbatim: `§18 Scene direction — AUTHOR-WRITTEN five fields:` followed by 6 enumerated items (ENTRY PRESSURE / SCENE QUESTION / VALUE DELTA TARGET / REQUIRED TURN / STOPPING POINT / DO NOT REVEAL). Confirmed by direct read.
2. L1: `.claude/skills/_shared-templates/page-plan.md` §18 (lines 190-208) has the same off-by-one (`AUTHOR-WRITTEN, not record-inlined. Five fields:` followed by 6 items). The shared template is the canonical source; fix here propagates correctly.
3. L1 cross-skill: `branching-story-page-cycle/references/phase-7-page-plan.md` line 148 says `§18 Scene direction — AUTHOR-WRITTEN five fields:` — same off-by-one. Page-cycle should also be fixed for consistency, but page-cycle's reference is out of bootstrap's scope; this ticket scopes to the bootstrap-touched files. The shared template fix benefits page-cycle automatically.
4. L2: `references/engine-envelope-shape.md` line 31 enumeration check — 4+19+1+8+4+2+3+5+3+20+1+1+5 = 76 at SF=19; 4+22+1+8+4+2+3+5+3+20+1+1+5 = 79 at SF=22. The "~75" is an inclusive lower bound and the range "75-80" is accurate.
5. L3: `references/phase-9-validation-gates.md` line 27 row 19 contains `plan_completeness_check (NEW)`; `references/phase-9-5-bootstrap-discipline-validator.md` line 23 row 11 contains `plan_self_containment (NEW)`. Both confirmed.
6. L4: `references/phase-9-5-bootstrap-discipline-validator.md` row 3 explicitly says `(post-BSBOOT-003)`; row 6 says `(post-BSBOOT-010)`. The text after the parenthetical does carry semantic content (e.g., `Every STINT carries stent_id (story entity it drives), world_character_id (or null for story-only)`) — so the parenthetical can be removed without losing meaning.
7. L5: `templates/story-records.yaml` lines 384 (`target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract`) and 385 (`uses_fact: SF-NNNN | null`) use pipe-syntax inline as if it were yaml — not valid. Compare to line 31 (`role_in_story: protagonist               # protagonist | major | supporting | antagonist | foil`) which uses an example value plus comment-form alternative enumeration — the preferred pattern across the file.
8. Cross-skill consumer check: no sibling skill cites any of these specific lines. The five fixes are bootstrap-internal polish; the L1 fix in `_shared-templates/page-plan.md` is shared but page-cycle's mirror is left unchanged in this ticket.
9. Mismatch + correction: all five sites need small edits as enumerated.

## Architecture Check

1. Five small unrelated edits batched as one ticket because they share a janitorial nature and would otherwise produce five 80-line tickets for content that's quicker to read inline than across separate ticket files.
2. No backwards-compatibility aliasing introduced — all five edits are straight corrections.

## Verification Layers

1. L1 → codebase grep-proof: `grep -rn "five fields" .claude/skills/branching-story-bootstrap/` returns 0 (or one match for a context-explanatory "the original spec named five fields but six are actually authored" if retained as historical note).
2. L2 → codebase grep-proof: `grep -n "~75 ops" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns 0; `grep -n "75-80" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns at least 1.
3. L3 → codebase grep-proof: `grep -rn "(NEW)" .claude/skills/branching-story-bootstrap/references/` returns 0.
4. L4 → codebase grep-proof: `grep -rn "post-BSBOOT-" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` returns 0.
5. L5 → manual review: the CHC schema in `templates/story-records.yaml` either parses as yaml (every value is a single token or empty), or uses example-value + comment-form alternatives consistent with the file's earlier convention.

## What to Change

### 1. L1 — "five fields" → "six fields"

In `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` §18, change `AUTHOR-WRITTEN five fields:` to `AUTHOR-WRITTEN six fields:`.

In `.claude/skills/_shared-templates/page-plan.md` §18, change `AUTHOR-WRITTEN, not record-inlined. Five fields:` to `AUTHOR-WRITTEN, not record-inlined. Six fields:`.

### 2. L2 — "~75 ops" → "~75-80 ops"

In `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` §1, change `A typical bootstrap envelope contains ~75 ops (4 STENT + 19-22 SF + 1 SE + 8 OBL + 4 THR + 2 SREL + 3 STINT + 5 STLOC + 3 STOBJ + 20 SLT + 1 BR + 1 PG + 5 CHC)` to `A typical bootstrap envelope contains ~75-80 ops (4 STENT + 19-22 SF + 1 SE + 8 OBL + 4 THR + 2 SREL + 3 STINT + 5 STLOC + 3 STOBJ + 20 SLT + 1 BR + 1 PG + 5 CHC)`.

### 3. L3 — strip "(NEW)" markers

In `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md`, change `| 19 | `plan_completeness_check` (NEW) |` to `| 19 | `plan_completeness_check` |`.

In `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`, change `| 11 | `plan_self_containment` (NEW) |` to `| 11 | `plan_self_containment` |`.

### 4. L4 — replace `(post-BSBOOT-NNN)` ticket references with semantic justifications

In `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md`:

- Row 3 (currently `STINT structural completeness (post-BSBOOT-003)`): change to `STINT structural completeness`. The rest of the row already explains what is checked.
- Row 6 (currently `SF.reader_visibility_basis (post-BSBOOT-010)`): change to `SF.reader_visibility_basis`. Same rationale.

### 5. L5 — normalize CHC schema yaml syntax

In `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`, normalize the CHC schema block (around lines 376-417) to follow the file's earlier example-value + comment-form alternative pattern. Specifically:

- Line 384 (`target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract`) → `target: STENT-NNNN                        # STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract`.
- Line 385 (`uses_fact: SF-NNNN | null`) → `uses_fact: null                           # SF-NNNN | null`.
- Audit the rest of the CHC schema for similar inline pipe-syntax and apply the same pattern.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-7-root-page-plan.md` (modify — L1)
- `.claude/skills/_shared-templates/page-plan.md` (modify — L1, shared template)
- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify — L2)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify — L3)
- `.claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` (modify — L3 + L4)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify — L5)

## Out of Scope

- `.claude/skills/branching-story-page-cycle/references/phase-7-page-plan.md` "five fields" mirror — same off-by-one, but page-cycle is out of bootstrap's scope. A follow-up BSPAGE-NN may pick it up.
- Wholesale yaml-validity audit of `templates/story-records.yaml` — only the CHC-section inconsistencies are addressed. Other sections may have analogous patterns; out of scope.
- The architecture question of whether `engine-envelope-shape.md` should be renamed or moved to `_shared-templates/` — flagged in the audit report, deliberately deferred.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "five fields" .claude/skills/branching-story-bootstrap/ .claude/skills/_shared-templates/` returns 0 matches.
2. `grep -n "~75 ops" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns 0 matches.
3. `grep -rn "(NEW)" .claude/skills/branching-story-bootstrap/references/` returns 0 matches.
4. `grep -rn "post-BSBOOT-" .claude/skills/branching-story-bootstrap/references/phase-9-5-bootstrap-discipline-validator.md` returns 0 matches.
5. `python3 -c "import yaml; yaml.safe_load_all(open('.claude/skills/branching-story-bootstrap/templates/story-records.yaml').read())"` parses without error — the CHC section's normalized yaml passes.

### Invariants

1. Documentation states named field counts accurately (no "five fields, then six").
2. Schema templates parse as the format they claim to be (yaml templates parse as yaml).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn "five fields" .claude/skills/branching-story-bootstrap/ .claude/skills/_shared-templates/` — verify L1.
2. `grep -n "75-80 ops\|~75 ops" .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` — verify L2 (former returns 1, latter returns 0).
3. `grep -rn "(NEW)\|post-BSBOOT-" .claude/skills/branching-story-bootstrap/references/` — verify L3+L4 together.
4. `python3 -c "import yaml; list(yaml.safe_load_all(open('.claude/skills/branching-story-bootstrap/templates/story-records.yaml')))"` — verify L5.
