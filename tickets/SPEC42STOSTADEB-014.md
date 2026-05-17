# SPEC42STOSTADEB-014: Cross-class contract doc + CLAUDE.md inventory updates

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No new production code; documentation-only ticket landing the cross-class story-state-contract.md updates (§5 predicate list, §6 integration matrix, §8 page-plan §10b section) and the CLAUDE.md Story Bundles inventory update. Per the spec-to-tickets §Cross-Cutting Docs Ticket Shape, this is a cross-cutting docs ticket that lands atomically once all upstream implementation tickets have shipped
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, SPEC42STOSTADEB-003, SPEC42STOSTADEB-005, SPEC42STOSTADEB-006, SPEC42STOSTADEB-007

## Problem

The per-class foundation tickets (SPEC42STOSTADEB-001 / -002 / -003) each touch `.claude/skills/_shared-templates/story-state-contract.md` for their class-specific §3 row + §4.N schema text + §4.2 active_records enum extension. The per-class validator+predicate tickets (-005 / -006 / -007) each extend `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`. But three CROSS-CLASS contract-doc surfaces remain unowned: §5 (predicate-DSL grammar table — needs 12 new entries: 4 CLK + 4 STSEC + 4 STQ); §6 (story-pipeline integration matrix — needs 3 new rows); §8 (page-plan minimum contract — needs the new §10b section description). Additionally, `CLAUDE.md` enumerates the story-bundle record classes in its Story Bundles section and must be updated to include CLK/STSEC/STQ. This ticket lands all four docs surfaces atomically once upstream tickets have shipped — splitting per-surface would create staleness windows where the docs partially describe the post-implementation state.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/_shared-templates/story-state-contract.md` exists; `CLAUDE.md` exists with a Story Bundles section enumerating the current 17 record classes (verified in CLAUDE.md content already in context for this session). The four cross-class docs surfaces (§5, §6, §8, CLAUDE.md inventory) are NOT touched by any per-class foundation ticket — they are correctly scoped to this cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables "Canonical contract updates" section enumerates the four cross-class surfaces; §Deliverables "Documentation" section names the CLAUDE.md update; SPEC-42 §Risks "Phase 4 page-plan section addition" recommendation: §10b is per-page-computed (not inlined verbatim like §2 / §3 / §19) — this ticket documents the §10b SECTION DESCRIPTION in §8, but the per-page-computed RENDERING is implemented by SPEC42STOSTADEB-009.
3. Cross-skill / cross-tool shared boundary: the shared `story-state-contract.md` is the canonical reference for all Skill Category 2c story-pipeline skills. Cross-class docs surfaces (§5 predicate list, §6 integration matrix, §8 page-plan section) describe pipeline-wide conventions that all 7 story-pipeline skills consume. The atomic landing of this ticket (after all upstream tickets) ensures the docs describe the actual post-implementation state, not a partial state.

## Architecture Check

1. **Cross-cutting docs ticket per §Cross-Cutting Docs Ticket Shape**: all four docs surfaces require all upstream implementation tickets to have shipped for the docs to land coherently. Without atomic landing, individual ticket-level docs updates would create staleness windows (e.g., §5 predicate list partially populated with CLK predicates but not STSEC/STQ; §6 integration matrix showing CLK row but not STSEC/STQ rows).
2. **`Deps: lists every upstream implementation ticket**: unlike §Spec-Integration Ticket Shape (which uses transitive-head dep), docs tickets reference each surface independently per the §Cross-Cutting Docs Ticket Shape guidance — the §5 predicate list grows by 4 entries per upstream ticket (-005 / -006 / -007); the §6 integration matrix grows by one row per class (-001 / -002 / -003); CLAUDE.md inventory grows by 3 entries (one per class). Enumerating every upstream ticket in Deps makes the docs-to-surface relationship explicit.
3. **§10b page-plan section: description here, rendering elsewhere**: this ticket adds the §10b section DESCRIPTION to §8 of the contract; SPEC42STOSTADEB-009 implements the per-page-computed RENDERING in turn-cycle Phase 7. The two-ticket split keeps the docs canonical description (§8) separate from the skill-implementation logic (Phase 7).

## Verification Layers

1. Grep-proof: `grep -nE 'clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due' .claude/skills/_shared-templates/story-state-contract.md` returns 12 hits in §5 — verifies the predicate list grew by 12 entries
2. Grep-proof: §6 integration matrix has 3 new rows for CLK / STSEC / STQ → grep for the class names in §6
3. Grep-proof: §8 has a new §10b section description → grep for `§10b` or "Open Setups, Active Clocks, Hidden Secrets" in §8
4. Grep-proof: CLAUDE.md Story Bundles inventory list includes CLK / STSEC / STQ → grep for the class names in CLAUDE.md
5. No production code changes — verified by grep of `tools/` for any modification (this ticket touches only docs)

## What to Change

### 1. story-state-contract.md §5 — predicate-DSL grammar table extension

Modify `.claude/skills/_shared-templates/story-state-contract.md` §5 (the closed predicate DSL list). Add 12 new entries:
- CLK predicates (4): `clock_at_least(CLK-<int>, value)`, `clock_below(CLK-<int>, value)`, `clock_full(CLK-<int>)`, `any_clock_active(alias, kind?, salience?)`
- STSEC predicates (4): `secret_unrevealed(STSEC-<int>)`, `secret_revealed(STSEC-<int>)`, `revelation_ready(STSEC-<int>)`, `any_secret_unrevealed(alias, salience?, kind?)`
- STQ predicates (4): `story_question_open(STQ-<int>)`, `story_question_status(STQ-<int>, status)`, `any_story_question_open(alias, salience?, setup_kind?)`, `promise_due(STQ-<int>, age_pages)`

Each entry follows the existing §5 format (predicate signature + one-line semantics). The §5 predicate-DSL grammar grows from 22 entries (verified at SPEC-42 brainstorm) to 34 entries.

### 2. story-state-contract.md §6 — integration matrix extension

Modify §6 (story-pipeline integration matrix). Add 3 new rows for CLK / STSEC / STQ. Each row describes which story-pipeline skills consume the class and via which integration surface (predicate / op / receipt observation / audit check). Follow the existing per-class row format.

### 3. story-state-contract.md §8 — page-plan §10b section description

Modify §8 (page-plan minimum contract). Add a new §10b section description: "**§10b — Open Setups, Active Clocks, Hidden Secrets** (per-page-computed, not inlined verbatim). Renders the current page's active CLK records (value/max + nearest threshold + salience), active STSEC records (status + holders + carrier discovery count), and active STQ records (status + salience + audience_visibility). Omitted entirely when all three sets are empty. Sub-sections render only when relevant content exists. Implemented by `branching-story-turn-cycle` Phase 7 per SPEC42STOSTADEB-009."

### 4. CLAUDE.md Story Bundles inventory extension

Modify `CLAUDE.md` Story Bundles section. The inventory list of story-bundle record classes (currently enumerating STENT, STSTAT, STINT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, BR, PG, CHC, SLT and the auxiliary SLB, SAU, SP, RSP) gets three new entries: **CLK** (Pressure Clock — staged pressure with value/max/thresholds), **STSEC** (Story Secret — story-local hidden truth with clue_carriers[]), **STQ** (Story Question — present-causal open-setup state with §5c discipline).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5 grammar table 12 new entries; §6 integration matrix 3 new rows; §8 §10b section description)
- `CLAUDE.md` (modify — Story Bundles section inventory list 3 new class entries)

## Out of Scope

- CLK/STSEC/STQ class foundations (incl. §3 catalog rows, §4.6 / §4.7 / §4.8 per-class schemas, §4.2 active_records enum extension) — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators + predicate-grammar parser extensions — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- §10b per-page-computed RENDERING in turn-cycle Phase 7 — owned by SPEC42STOSTADEB-009
- MCP retrieval surface — owned by SPEC42STOSTADEB-004
- Other skill integrations — owned by SPEC42STOSTADEB-010 through -013

## Acceptance Criteria

### Tests That Must Pass

1. Grep-proof: `grep -cE '(clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due)' .claude/skills/_shared-templates/story-state-contract.md` returns at least 12 (the 12 new predicate names in §5; may also appear elsewhere in the doc)
2. Grep-proof: §6 integration matrix has rows mentioning CLK, STSEC, STQ (`grep -n 'CLK\|STSEC\|STQ' .claude/skills/_shared-templates/story-state-contract.md` shows hits in the §6 region)
3. Grep-proof: §8 has §10b section (`grep -n '§10b\|10b\|Open Setups, Active Clocks' .claude/skills/_shared-templates/story-state-contract.md` shows hits in §8)
4. Grep-proof: `grep -n 'CLK\|STSEC\|STQ' CLAUDE.md` shows hits in the Story Bundles section inventory list
5. No production code changes — `git diff tools/` shows no modifications

### Invariants

1. The §5 predicate list grows from 22 entries (pre-SPEC-42) to 34 entries (12 new) — purely additive
2. The §6 integration matrix grows by 3 rows — purely additive
3. The §8 page-plan minimum contract grows by 1 new section description (§10b) — purely additive
4. CLAUDE.md inventory grows by 3 entries — purely additive
5. No production code is altered

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based (grep-proofs) and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -cE '(clock_at_least|clock_below|clock_full|any_clock_active|secret_unrevealed|secret_revealed|revelation_ready|any_secret_unrevealed|story_question_open|story_question_status|any_story_question_open|promise_due)' .claude/skills/_shared-templates/story-state-contract.md` — verify §5 predicate-list growth
2. `grep -n '§4.6\|§4.7\|§4.8\|§10b' .claude/skills/_shared-templates/story-state-contract.md` — verify the new sections exist
3. `grep -n 'CLK\|STSEC\|STQ' CLAUDE.md` — verify the inventory extension landed
4. `git diff --stat tools/` — verify no production code changes (output should show zero file modifications under tools/)
5. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
